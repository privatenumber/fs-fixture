---
name: fs-fixture
description: Create disposable file system test fixtures from objects, templates, or empty directories with automatic cleanup. Use when writing tests that need temporary files, directories, symlinks, or JSON fixtures on disk. Keywords - fs, tmp, temp, fixture, testing utility, cleanup, dispose.
---

## Quick Start

```ts
import { createFixture } from 'fs-fixture'

// From object — keys are paths, values are content
const fixture = await createFixture({
    'package.json': JSON.stringify({ name: 'test' }),
    'src/index.js': 'export default 42',
})

// Use fixture.path, fixture.readFile(), etc.
await fixture.rm() // Cleanup when done
```

Auto-cleanup with `using` (TypeScript 5.2+):
```ts
await using fixture = await createFixture({ 'file.txt': 'content' })
// Automatically cleaned up when scope exits
```

## createFixture(source?, options?)

| Source | Behavior |
|--------|----------|
| `{ path: content }` | Create files from object. Nested objects create directories. |
| `'./path'` | Copy template directory into fixture |
| _(omitted)_ | Empty temporary directory |

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tempDir` | `string \| URL` | `os.tmpdir()` | Custom parent directory |
| `templateFilter` | `(src, dest) => boolean` | — | Filter files when copying template |

## FsFixture Methods

| Method | Description |
|--------|-------------|
| `fixture.path` | Absolute path to fixture root |
| `getPath(...paths)` | Resolve path relative to fixture root |
| `exists(path?)` | Check existence (returns `boolean`) |
| `readFile(path, encoding?)` | Read file — `'utf8'` returns `string`, omit for `Buffer` |
| `writeFile(path, content)` | Write string or Buffer |
| `readJson<T>(path)` | Read and parse JSON with type parameter |
| `writeJson(path, data, space?)` | Write JSON (default: 2-space indent, `0` for minified) |
| `readdir(path, options?)` | List directory (`{ withFileTypes: true }` for Dirent[]) |
| `mkdir(path)` | Create directory recursively |
| `cp(source, dest?)` | Copy external file/directory into fixture |
| `mv(source, dest)` | Move or rename within fixture |
| `rm(path?)` | Delete path, or entire fixture if omitted |

## FileTree Values

| Type | Example |
|------|---------|
| `string` | `'file content'` |
| `Buffer` | `Buffer.from([0x89, 0x50])` |
| Nested object | `{ dir: { 'file.txt': 'content' } }` |
| Function | `({ fixturePath, filePath, getPath, symlink }) => symlink('./target')` |

Path syntax — these are equivalent:
```ts
// Nested objects
{ src: { utils: { 'helper.js': 'code' } } }

// Slash-separated keys
{ 'src/utils/helper.js': 'code' }
```

## Patterns

### Symlinks
```ts
const fixture = await createFixture({
    'target.txt': 'real file',
    'link.txt': ({ symlink }) => symlink('./target.txt'),
    'node_modules/pkg': ({ symlink }) => symlink(process.cwd()),
})
```

### Dynamic content
```ts
const fixture = await createFixture({
    'info.txt': ({ fixturePath }) => `Root: ${fixturePath}`,
})
```

## Related

Commonly used with `manten` test framework.
