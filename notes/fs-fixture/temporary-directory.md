# Temporary directory and fixture paths

Each fixture is a directory that `fs.mkdtemp()` creates directly inside a base directory. The base is the canonicalized `os.tmpdir()` by default, or the `tempDir` option as given. This note records how each part came to be.

Last verified against v2.16.0.

## Current behavior

The code is in [`src/utils/temporary-directory.ts`](../../src/utils/temporary-directory.ts) and `createFixturePath()` in [`src/index.ts`](../../src/index.ts).

| Input | Base directory | Fixture directory |
| --- | --- | --- |
| No `tempDir` | `fs.realpathSync(os.tmpdir())`, computed once when the module loads | `fs.mkdtemp(<base>/fs-fixture-)`, such as `fs-fixture-P8M77U` |
| `tempDir` string or URL | `path.resolve()` of the value, with no symlink resolution. fs-fixture creates it with `mkdir({ recursive: true })` | Same as above |
| Custom `fs` without `mkdtemp` | Same as above | `fs-fixture-<pid>-<counter>`, created with `mkdir()` |

`fixture.path` has no trailing separator.

## Decisions

### Resolve symlinks in `os.tmpdir()`

The base has been `fs.realpathSync(os.tmpdir())` since the first commit ([`9205452`](https://github.com/privatenumber/fs-fixture/blob/92054521abe54fb169dbe7a0aa8d4e1ba1080db2/src/utils.ts#L5)). The history does not record a rationale.

The observable effect on macOS is that `os.tmpdir()` is under the `/var` symlink and the fixture path is under `/private/var`. Observed on macOS with Node.js v24.14.0:

```console
$ node -p "require('os').tmpdir() + ' | ' + require('fs').realpathSync(require('os').tmpdir())"
/var/folders/xt/.../T | /private/var/folders/xt/.../T
```

Without this, `fixture.path` and any path that a tool resolves with `realpath`, such as a module ID, are two different strings for the same file.

Known limitation: the JS `fs.realpathSync` does not expand Windows 8.3 short names, such as `RUNNER~1` in the GitHub Actions `os.tmpdir()`. A tool that compares `fixture.path` with a path from `fs.realpathSync.native` sees a mismatch. Tracked in [privatenumber/fs-fixture#36](https://github.com/privatenumber/fs-fixture/issues/36).

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

The pluggable `fs` option ([`f8249e1`](https://github.com/privatenumber/fs-fixture/commit/f8249e19f348fe73cb4e3da781ebd21c542009fa), v2.13.0) made `mkdtemp` optional, because virtual filesystems may not implement it. The fallback name `fs-fixture-<pid>-<counter>` uses a process-wide counter. It is unique within one process and one base directory, which is enough for an in-memory filesystem that one process owns.

### Trailing separator was dropped

[`2b41dc4`](https://github.com/privatenumber/fs-fixture/commit/2b41dc4959a1a879685349151fb838394f92b7c2) (v2.1.0, "fix: fixture path to end with a slash") made `fixture.path` end with `/`. The history does not record why.

[`3036afe`](https://github.com/privatenumber/fs-fixture/commit/3036afe646a1361ea89c00a7a968ef9f3cbdbfa5) (v2.10.0) removed the trailing separator as a side effect. The old code built the path with `path.join(base, 'name/')`, which keeps the trailing `/`. `fs.mkdtemp()` returns a path without one. The commit message does not mention this change, and no issue reports it. Code that needs a separator should use `fixture.getPath()` or `path.join()` rather than string concatenation.
