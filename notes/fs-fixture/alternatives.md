# Comparable projects

How similar Node.js libraries create temporary directories, and how fs-fixture differs. Use this note when a decision in fs-fixture has a precedent elsewhere, such as how to canonicalize the temporary base.

Last verified 2026-11-05 against the release tags linked below.

## Temporary base canonicalization

Every library below that picks a base starts from `os.tmpdir()`. They differ in which `realpath` they use. The JS `fs.realpathSync` and `fs.realpath` resolve symlinks one path component at a time ([Node v24.11.1 `lib/fs.js#L2741-L2810`](https://github.com/nodejs/node/blob/v24.11.1/lib/fs.js#L2741-L2810)). `fs.realpathSync.native` and `fs.promises.realpath` ask the operating system through libuv ([`lib/internal/fs/promises.js#L1171-L1176`](https://github.com/nodejs/node/blob/v24.11.1/lib/internal/fs/promises.js#L1171-L1176)). Only the native one expands Windows 8.3 short names and normalizes case.

| Project | Base | Realpath |
| --- | --- | --- |
| fs-fixture v2.16.0 | `os.tmpdir()`, or `tempDir` without resolution | JS, `fs.realpathSync` ([source](https://github.com/privatenumber/fs-fixture/blob/v2.16.0/src/utils/temporary-directory.ts#L4)) |
| [temp-dir v2.0.0](https://github.com/sindresorhus/temp-dir/blob/v2.0.0/index.js#L5-L13) | `os.tmpdir()`, cached on `global` | JS, `fs.realpathSync` |
| [temp-dir v3.0.0](https://github.com/sindresorhus/temp-dir/blob/v3.0.0/index.js#L1-L6) | `os.tmpdir()`, top-level `await` | Native, `fs.promises.realpath` |
| [tempy v3.1.0](https://github.com/sindresorhus/tempy/blob/v3.1.0/index.js#L7-L12) | temp-dir `^3.0.0` ([manifest](https://github.com/sindresorhus/tempy/blob/v3.1.0/package.json#L41)) | Native, through temp-dir |
| [tmp v0.2.5](https://github.com/raszi/node-tmp/blob/v0.2.5/lib/tmp.js#L713-L729) | `options.tmpdir` or `os.tmpdir()` | JS, `fs.realpath` or `fs.realpathSync` |
| [fixturify-project v7.1.2](https://github.com/stefanpenner/node-fixturify-project/blob/v7.1.2/src/index.ts#L154-L160) | `tmp.dirSync()`, or an explicit `baseDir` without resolution | JS, `fs.realpathSync` on the created directory |
| [fixturify v3.0.0](https://github.com/joliss/node-fixturify/blob/v3.0.0/index.ts#L72-L80) | Caller-supplied directory | None |

temp-dir [issue #5](https://github.com/sindresorhus/temp-dir/issues/5) asked for `realpathSync.native` on Windows. A maintainer closed it and said Node should fix the behavior. The issue does not show that v3 switched to the promise API to fix short names. The switch may be a side effect of the move to ESM and top-level `await`.

### Vite's policy

Vite is the tool in [privatenumber/fs-fixture#36](https://github.com/privatenumber/fs-fixture/issues/36) that compares `fixture.path` with its own resolved paths, so its policy defines what "canonical" means for that integration. [`safeRealpathSync` in Vite v7.3.1](https://github.com/vitejs/vite/blob/v7.3.1/packages/vite/src/node/utils.ts#L677-L736):

- On macOS and Linux, uses `fs.realpathSync.native`.
- On Windows, starts with JS `fs.realpathSync`. On first use, it probes `fs.realpathSync.native` on the working directory. If the probe throws `EISDIR`, which RAM disks such as ImDisk cause, Vite keeps the JS version. Otherwise it switches to native, and it maps UNC results back to mapped drive letters found by `net use`.

## Feature comparison

| Project | Object-tree fixtures | Template directory | Cleanup |
| --- | --- | --- | --- |
| fs-fixture | Yes | Yes, through `fs.cp` | `fixture.rm()` or `await using` |
| [fixturify](https://github.com/joliss/node-fixturify/blob/v3.0.0/index.ts#L5-L25) | Yes, read and write | No | Caller owns the directory |
| [fixturify-project](https://github.com/stefanpenner/node-fixturify-project/blob/v7.1.2/src/index.ts#L25-L30) | Yes, focused on npm packages and their dependencies | No | `tmp` cleanup |
| [tempy](https://github.com/sindresorhus/tempy/blob/v3.1.0/index.js#L16-L21) | No | No | Callback-scoped `rm` |
| [`fs.mkdtempDisposableSync`](https://nodejs.org/docs/v24.11.1/api/fs.html#fsmkdtempdisposablesyncprefix-options) (Node.js v24.4.0+) | No | No | `using` |

## Evidence gaps

- No Windows reproduction of the ImDisk, long-path, `subst`, or mapped-drive failures of `fs.realpathSync.native` on current Node.js versions. The reports are historical: [nodejs/node#6861](https://github.com/nodejs/node/issues/6861), [nodejs/node#39721](https://github.com/nodejs/node/issues/39721), [nodejs/node#37737](https://github.com/nodejs/node/issues/37737).
- No library found that has both template directories and `Symbol.asyncDispose` cleanup.
