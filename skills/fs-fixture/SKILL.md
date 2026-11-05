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
| `(fixture) => ...` | Run complex, imperative, or ordered setup and optionally return a FileTree |
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
| `readdir()`, `readdir(path, options?)` | List fixture root or directory. Pass `''` for root options. `{ withFileTypes: true }` returns Dirent[]. |
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

> [!TIP]
> Slash-separated keys can also group a shared prefix:
>
> ```ts
> await createFixture({
>     'file.js': 'import { a } from "my-pkg";',
>
>     'node_modules/my-pkg': {
>         'package.json': JSON.stringify({
>             name: 'my-pkg',
>             type: 'module',
>             exports: './index.js'
>         }),
>         'index.js': 'export const a = 1;'
>     }
> })
> ```

## Patterns

### Choosing a source

- Prefer a FileTree for files and directories.
- Use an initializer function for complex, imperative, or ordered setup, such as initializing a Git repository or running a project setup helper.
- Return a FileTree from an initializer for declarative files that should be created after setup completes.
- Use a FileTree entry function for isolated dynamic file content.

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

### Initialization
```ts
const fixture = await createFixture(async ({ path, writeJson }) => {
    await writeJson('package.json', { name: 'test-package' })

    // Test-specific setup that needs the fixture path.
    await initializeProject(path)

    return {
        'src/index.js': 'export default 42',
    }
})
```

The initializer receives the fixture before it is returned. It contains setup with the fixture it configures and can return a FileTree to create after setup completes. Returned files overwrite regular files created during setup, but the tree does not replace the fixture directory. If setup fails, fs-fixture removes the fixture before it rethrows the error.

## Related

Commonly used with `manten` test framework.
