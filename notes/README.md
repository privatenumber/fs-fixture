# Engineering research notes

Tracked maintainer references for the decisions and upstream contracts that shape fs-fixture. These notes are not published: `package.json#files` ships only `dist` and `skills`.

## Ownership

Each upstream folder owns that tool's behavior, implementation, and version boundaries. The `fs-fixture/` folder owns project policy, design decisions, and comparisons with other projects, and links to upstream evidence.

## Index

| Folder | Owns |
| --- | --- |
| [fs-fixture/](./fs-fixture/README.md) | Design decisions, their history and rationale, and comparisons with similar libraries |

## Evidence

Cite upstream facts beside the claim using primary sources, preferably pinned releases or commits. Ground project behavior in repository source or tests, and label decisions with their rationale. When the history does not record a rationale, say so instead of inferring one. Keep executable contracts in the test suite.

## Maintenance

When upstream evidence changes, update the notes and identify affected project decisions and tests. When a change reverses a decision recorded here, update the note in the same change.
