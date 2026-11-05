# fs-fixture

Design decisions in fs-fixture, the history and evidence behind them, and comparisons with similar projects.

- [temporary-directory.md](./temporary-directory.md): how the base directory and fixture names are chosen, including realpath, `tempDir`, `mkdtemp`, and the dropped trailing separator.
- [api-design.md](./api-design.md): Node.js support policy, the type-only `FsFixture` export, the fixture creation order, fixture sources, and open proposals.
- [tooling.md](./tooling.md): constraints from running TypeScript with Node.js type stripping, and the Windows CI job.
- [alternatives.md](./alternatives.md): how tempy, tmp, fixturify, fixturify-project, and Vite pick and canonicalize temporary paths, and a feature comparison.
