# Tooling constraints

Constraints from the build and test setup that are not obvious from the code. Last verified against v2.16.0.

## Source must be erasable TypeScript

Tests run the TypeScript sources directly with Node.js type stripping (`node tests/index.ts`), not through a transpiler. [`d9d8fe1`](https://github.com/privatenumber/fs-fixture/commit/d9d8fe14d2db2f725a566b16b86ea13b738f98e3) (v2.13.0) moved from tsx to this setup. Node.js can only remove type syntax, so [`tsconfig.json`](../../tsconfig.json) enables `erasableSyntaxOnly` and `verbatimModuleSyntax`.

The consequence is visible in [`src/utils/path-base.ts`](../../src/utils/path-base.ts) and [`src/utils/symlink.ts`](../../src/utils/symlink.ts): classes declare fields and assign them in the constructor, because constructor parameter properties such as `constructor(readonly path: string)` need code generation. Enums and namespaces are not allowed for the same reason.

Imports between source files use the `.js` extension, as `module: nodenext` requires. The package `imports` map points `#fs-fixture` at `src/index.ts` under the `development` and `types` conditions, so tests can import the source or the built `dist`.

## Windows CI

[`fb74ae2`](https://github.com/privatenumber/fs-fixture/commit/fb74ae2d7a3b6a5a2a537b0231122d14b4cb5075) (v2.12.0) added `windows-latest` to the test matrix after a bug where `fixture.cp()` checked only `path.sep` for a trailing separator, which misses `/` on Windows. The job puts the pnpm store on a Dev Drive to make installs faster ([`.github/workflows/test.yml`](../../.github/workflows/test.yml)).

The matrix has no macOS job. macOS-specific behavior, such as the `/var` to `/private/var` symlink in `os.tmpdir()`, is covered only by local runs.
