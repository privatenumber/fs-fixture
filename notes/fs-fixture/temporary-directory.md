# Temporary directory and fixture paths

Each fixture is a directory that `fs.mkdtemp()` creates directly inside a base directory. The base is the canonicalized `os.tmpdir()` by default, or the `tempDir` option as given. This note records how each part came to be.

Last verified 2026-11-05 against the source after v2.16.0.

## Current behavior

The code is `createFixturePath()` in [`src/index.ts`](../../src/index.ts).

| Input | Base directory | Fixture directory |
| --- | --- | --- |
| No `tempDir` | `fs.promises.realpath(os.tmpdir())`, computed for each fixture | `fs.mkdtemp(<base>/fs-fixture-)`, such as `fs-fixture-P8M77U` |
| `tempDir` string or URL | `path.resolve()` of the value, with no symlink resolution | Same as above |
| Custom `fs` without `mkdtemp` | Same as above | `fs-fixture-<random UUID>`, created with a non-recursive `mkdir()` |

fs-fixture creates the base with `mkdir({ recursive: true })` when `tempDir` is given or a custom `fs` is used:

- A custom `fs` such as memfs may not contain the OS temporary directory, and memfs's `mkdtemp()` requires the parent to exist, as `node:fs` does. The test `creates fixture in memfs without tempDir` in [`tests/custom-fs.ts`](../../tests/custom-fs.ts) covers this.
- `@platformatic/vfs` has no `mkdtemp()`. Its tests use the fallback, which created the fixture with a recursive `mkdir()`, so they did not catch the missing parent.
- With the default `node:fs` and no `tempDir`, the base is the OS temporary directory, which exists. The `mkdir()` is skipped, because a recursive `mkdir()` of a Windows drive root, such as `TEMP=C:\`, throws `EPERM` ([Node.js v24.11.1 docs](https://github.com/nodejs/node/blob/v24.11.1/doc/api/fs.md#L3479-L3487)).

`fixture.path` has no trailing separator.

## Decisions

### Resolve symlinks in `os.tmpdir()`

The base has resolved symlinks in `os.tmpdir()` since the first commit, which used `fs.realpathSync` ([`9205452`](https://github.com/privatenumber/fs-fixture/blob/92054521abe54fb169dbe7a0aa8d4e1ba1080db2/src/utils.ts#L5)). The history does not record a rationale.

The observable effect on macOS is that `os.tmpdir()` is under the `/var` symlink and the fixture path is under `/private/var`. Observed on macOS with Node.js v24.14.0:

```console
$ node -p "require('os').tmpdir() + ' | ' + require('fs').realpathSync(require('os').tmpdir())"
/var/folders/xt/.../T | /private/var/folders/xt/.../T
```

Without this, `fixture.path` and any path that a tool resolves with `realpath`, such as a module ID, are two different strings for the same file.

### Use the native realpath for each fixture

The base is `await fs.promises.realpath(os.tmpdir())`, resolved each time `createFixture()` runs. `fs.promises.realpath` uses the native implementation, not the JS one.

The two implementations use different algorithms:

- The JS `fs.realpathSync` walks the path one component at a time with `lstat`, and replaces only components that are symlinks ([Node v24.11.1 `lib/fs.js#L2741-L2810`](https://github.com/nodejs/node/blob/v24.11.1/lib/fs.js#L2741-L2810)). Other components keep their spelling.
- `fs.realpathSync.native` calls libuv's `uv_fs_realpath` ([`lib/fs.js#L2836-L2841`](https://github.com/nodejs/node/blob/v24.11.1/lib/fs.js#L2836-L2841)). On Windows, libuv opens the path and asks the OS for its final name with `GetFinalPathNameByHandleW` ([libuv v1.51.0 `src/win/fs.c#L2952-L2974`](https://github.com/libuv/libuv/blob/v1.51.0/src/win/fs.c#L2952-L2974)). On Unix, it calls libc `realpath` ([`src/unix/fs.c#L793-L802`](https://github.com/libuv/libuv/blob/v1.51.0/src/unix/fs.c#L793-L802)). `fs.promises.realpath` uses the same binding ([`lib/internal/fs/promises.js#L1171-L1176`](https://github.com/nodejs/node/blob/v24.11.1/lib/internal/fs/promises.js#L1171-L1176)).

So the JS version keeps a Windows 8.3 short name, such as `RUNNER~1` in the GitHub Actions `os.tmpdir()`. It also keeps a wrong-case spelling on a case-insensitive filesystem. Tools that resolve paths natively, such as Vite, then see a different string for the same file. In [privatenumber/fs-fixture#36](https://github.com/privatenumber/fs-fixture/issues/36), Vite resolved module IDs outside its `server.fs.allow` list, which held `fixture.path`, so its dev server served raw files instead of transformed ones.

The test `fixture path is canonical when os.tmpdir() is not` in [`tests/index.ts`](../../tests/index.ts) locks this behavior:

- It sets `TMPDIR`, `TEMP`, and `TMP` to an uppercase alias of the real temporary directory, and restores them in `finally`. On a case-insensitive filesystem the alias is the same directory, and the JS realpath keeps its spelling, as it keeps `RUNNER~1`. This does not depend on 8.3 name generation, which some Windows volumes disable.
- It first asserts that the alias differs from its native realpath, so it fails instead of passing trivially when the platform cannot form an alias. It is skipped on Linux, which is case-sensitive.
- Concurrent tests can see the alias while it is set. It is the same directory, so they still pass.

Observed with Node.js v26.13.0 on macOS: with the JS realpath, the test fails with `Received: "/PRIVATE/VAR/FOLDERS/.../T"`. With the native realpath, it passes. The Windows CI job failed in the same way when the fix was reverted: `Received: "C:\\USERS\\RUNNERADMIN\\APPDATA\\LOCAL\\TEMP"`.

Resolving for each fixture, instead of once at import, has these effects:

- Importing fs-fixture does no filesystem work.
- If the native call throws, `createFixture()` rejects. An import-time failure would make `import 'fs-fixture'` fail.
- Changes to `TMPDIR` after import take effect, as they do for `os.tmpdir()`.
- Each fixture costs one more `realpath` call. This is small next to the `mkdtemp()` call and the file writes. This is an estimate, not a measurement.

Decision: no fallback to the JS realpath. The native call can fail where the JS one succeeds. [nodejs/node#6861](https://github.com/nodejs/node/issues/6861) reports `EISDIR` on an ImDisk RAM disk with Node.js 6. Vite still probes for that error and falls back ([`safeRealpathSync` in Vite v7.3.1](https://github.com/vitejs/vite/blob/v7.3.1/packages/vite/src/node/utils.ts#L709-L719)). [temp-dir v3](https://github.com/sindresorhus/temp-dir/blob/v3.0.0/index.js#L1-L6), which tempy uses, resolves `os.tmpdir()` with `fs.promises.realpath` and has no fallback. No current reproduction of the failure was found, so fs-fixture follows temp-dir.

Known gaps:

- On a mapped network drive or a `subst` drive, the native version can return a different drive spelling, such as a UNC path ([nodejs/node#37737](https://github.com/nodejs/node/issues/37737)). A temporary directory on such a drive was not tested.
- Revisit if a user reports that `createFixture()` fails on a RAM disk or similar volume. A fallback is then one `.catch()` that calls `fs.realpathSync`.

### Do not canonicalize `tempDir`

The `tempDir` option ([#6](https://github.com/privatenumber/fs-fixture/pull/6), v2.5.0) lets a fixture live inside the project, so that it can resolve the project's dependencies. The original use case was "placing them in a specific gitignored directory in the project". URL support came in [`cccdfac`](https://github.com/privatenumber/fs-fixture/commit/cccdfac108739d68e86978a5b0940a67553cac20) (v2.10.0).

The value goes through `path.resolve()` only. fs-fixture does not resolve symlinks in it. The history does not record whether this is deliberate.

### Put fixtures directly in the base directory

The first release put fixtures in `<tmp>/test-fixtures/<timestamp>/fixture-<n>`. [`452cf00`](https://github.com/privatenumber/fs-fixture/commit/452cf005038dd44475a560fb3ec351c09c8784f3) (v1.2.0) flattened this to `<tmp>/fs-fixture-<timestamp>-<n>`. The commit message gives the reason: "if every fixture is cleaned, there should be no extra directory left". `fixture.rm()` deletes only the fixture directory, so a shared parent would stay behind.

### Use `fs.mkdtemp()` for unique names

The name scheme had two problems:

1. `fs-fixture-<Date.now()>-<n>` collided when several processes loaded fs-fixture in the same millisecond. [`251bee6`](https://github.com/privatenumber/fs-fixture/commit/251bee676a80a5ca4872e9365c95d7b30ed1c1bd) (v2.7.1) added the PID: "PID because in Vitest, multiple processes start in parallel".
2. The timestamp was computed once at module load, so the name prefix was stale state for the life of the process.

[`3036afe`](https://github.com/privatenumber/fs-fixture/commit/3036afe646a1361ea89c00a7a968ef9f3cbdbfa5) (v2.10.0) replaced both with `fs.mkdtemp()`. It creates the directory atomically with a random suffix, so uniqueness no longer depends on process state. The commit message: "Replaces stateful temp directory generation with fs.mkdtemp to eliminate stale timestamp bug." A test creates fixtures in parallel to check uniqueness ([`dbf04ef`](https://github.com/privatenumber/fs-fixture/commit/dbf04ef2d4c581f7f56efc468f4a64ef69432a74)).

The pluggable `fs` option ([`f8249e1`](https://github.com/privatenumber/fs-fixture/commit/f8249e19f348fe73cb4e3da781ebd21c542009fa), v2.13.0) made `mkdtemp` optional, because virtual filesystems may not implement it. The fallback name is `fs-fixture-<random UUID>`, and fs-fixture creates it with a non-recursive `mkdir()`, so a collision throws `EEXIST` instead of two fixtures sharing one directory. `@platformatic/vfs` has no `mkdtemp()`, so its tests always use this fallback.

The first fallback name, `fs-fixture-<pid>-<counter>`, used a counter at module scope. The counter belonged to one module instance, not to the process. When the ESM and CJS builds were both loaded, each started at 1, and `mkdir({ recursive: true })` silently gave both fixtures the same directory. Removing one fixture removed the other. The test `fixtures without mkdtemp do not conflict across module instances` in [`tests/custom-fs.ts`](../../tests/custom-fs.ts) loads two fresh module instances to reproduce this.

### Trailing separator was dropped

[`2b41dc4`](https://github.com/privatenumber/fs-fixture/commit/2b41dc4959a1a879685349151fb838394f92b7c2) (v2.1.0, "fix: fixture path to end with a slash") made `fixture.path` end with `/`. The history does not record why.

[`3036afe`](https://github.com/privatenumber/fs-fixture/commit/3036afe646a1361ea89c00a7a968ef9f3cbdbfa5) (v2.10.0) removed the trailing separator as a side effect. The old code built the path with `path.join(base, 'name/')`, which keeps the trailing `/`. `fs.mkdtemp()` returns a path without one. The commit message does not mention this change, and no issue reports it. Code that needs a separator should use `fixture.getPath()` or `path.join()` rather than string concatenation.
