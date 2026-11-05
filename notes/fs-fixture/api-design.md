# API design decisions

Decisions about the public API and how it creates fixtures, with the evidence from commits, PRs, and issues. Temporary paths have their own note: [temporary-directory.md](./temporary-directory.md).

Last verified against v2.16.0.

## Node.js support

`engines.node` is `>=18.0.0`. [`2f5f05a`](https://github.com/privatenumber/fs-fixture/commit/2f5f05a472a38877efa0c907ae045bfdf142413e) (v2.0.0) raised it from older versions as a breaking change. [#2](https://github.com/privatenumber/fs-fixture/pull/2) closed Node v12 testing: "No longer support Node v12".

Node 18 support is partial by decision:

- `Symbol.asyncDispose` does not exist in Node 18, so [`src/fs-fixture.ts`](../../src/fs-fixture.ts) defines it as `Symbol.for('asyncDispose')` when it is missing ([`f104995`](https://github.com/privatenumber/fs-fixture/commit/f104995fd581a08f66146efd19ee4a7460d70a43), v2.0.0).
- `fixture.cp()` and template directories use `fs.cp`, which is experimental in Node 18. On [#7](https://github.com/privatenumber/fs-fixture/pull/7#issuecomment-2620519696), the maintainer accepted this: "realistically, I think it's unlikely most usages are on Node 18. If it is, they can file a bug and I'll add a polyfill."
- CI runs the main suite on Node 18.20.4 through tsx, because Node 18 cannot strip types ([`.github/workflows/test.yml`](../../.github/workflows/test.yml)). The custom `fs` suite needs Node 22+ and runs only on the `.nvmrc` version.

Revisit when Node 18 support is dropped: the polyfill and the tsx step can go.

## `FsFixture` is a type-only export

The package exports the `FsFixture` class as a type, not as a runtime value. [#4](https://github.com/privatenumber/fs-fixture/issues/4) reported that VS Code auto-imported `FsFixture` as a value in JSDoc-typed JavaScript, which then failed at runtime with "does not provide an export named 'FsFixture'". [#5](https://github.com/privatenumber/fs-fixture/pull/5) (v2.4.1) changed the declaration output to `export { type FsFixture }`, and the reporter confirmed the fix.

[`src/index.ts`](../../src/index.ts) keeps this with `export { type FsFixtureType as FsFixture }`.

## Fixture creation order

`createFixture()` creates every directory, explicit and implicit, before it writes any file or symlink ([`createFileTree()` in `src/index.ts`](../../src/index.ts)).

- [`3036afe`](https://github.com/privatenumber/fs-fixture/commit/3036afe646a1361ea89c00a7a968ef9f3cbdbfa5) (v2.10.0) fixed a race where a file could be written before its parent directory existed. It split creation into two phases: directories, then files.
- That fix created only explicit directories, so flat keys such as `'src/file.js'` broke. [`a11a5a8`](https://github.com/privatenumber/fs-fixture/commit/a11a5a83545d1ac7447cf2e293797356fd31917c) (v2.10.1) also adds the parent of every file and symlink.
- Each phase uses `settleAll()`, not `Promise.all()`. `Promise.all()` rejects while sibling writes are still running, so cleanup after a failure would race them. `settleAll()` waits for every operation, then throws the single error or an `AggregateError`. If initialization fails, `createFixture()` deletes the fixture and rethrows the initialization error, not a cleanup error.

## Sources

`createFixture(source)` accepts a template directory path, a `FileTree` object, or an initializer function.

- Function values inside a `FileTree` ([`0a7b577`](https://github.com/privatenumber/fs-fixture/commit/0a7b577a2bab9e18e58c44dcbf6d2920d37c348f), v2.1.0) receive the fixture path, `getPath()`, and `symlink()`. They can return content that depends on the final fixture path. An invalid return value throws a `TypeError` that names the path ([`3036afe`](https://github.com/privatenumber/fs-fixture/commit/3036afe646a1361ea89c00a7a968ef9f3cbdbfa5)).
- An initializer function as the whole source ([`fd5c6fb`](https://github.com/privatenumber/fs-fixture/commit/fd5c6fb5cab75dbe52e94a6aeada47ef7f439e92), v2.15.0) receives the live fixture. It can run ordered or imperative setup and return a `FileTree`, which fs-fixture creates afterward.
- An empty object creates an empty directory ([#9](https://github.com/privatenumber/fs-fixture/pull/9), v2.8.0).

## `templateFilter` skips the template root

`fs.cp()` calls its filter for the source directory itself before its contents. If the filter rejects that root, nothing is copied, so a filter such as `src => src.endsWith('.js')` produced an empty fixture. [#10](https://github.com/privatenumber/fs-fixture/pull/10) makes fs-fixture accept the template root without calling `templateFilter`, so the filter only sees entries inside the template.

- This is a fix, not a breaking change. Rejecting the root only ever produced an empty fixture, and the docs never described the root call. The visible change is one fewer filter call.
- The root check compares `path.toNamespacedPath(path.resolve(...))` of both paths. Node.js 18 on Windows passes `\\?\` namespaced paths to the filter, and a plain `path.resolve()` comparison missed the root there.
- The tests in the `templateFilter` group of [`tests/index.ts`](../../tests/index.ts) cover the root and an async filter.

## Open proposals

This PR is open and records a decision that is not made yet:

- [#12](https://github.com/privatenumber/fs-fixture/pull/12) proposes a debug method that keeps a fixture on disk after the test. It has no description.
