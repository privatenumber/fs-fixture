<p align="center">
	<img width="160" src=".github/logo.webp">
</p>
<h1 align="center">
	<sup>fs-fixture</sup>
	<br>
	<a href="https://npm.im/fs-fixture"><img src="https://badgen.net/npm/v/fs-fixture"></a> <a href="https://npm.im/fs-fixture"><img src="https://badgen.net/npm/dm/fs-fixture"></a>
</h1>

Simple API to create disposable test fixtures on disk. Tiny (`1.1 kB` gzipped) with zero dependencies!

### Features
- 📁 Create files & directories from simple objects
- 🧹 Automatic cleanup with `using` keyword
- 📝 Built-in JSON read/write support
- 🔗 Symlink support
- 💾 Binary file support with Buffers
- 🎯 TypeScript-first with full type safety
- 🔄 File methods inherit types directly from Node.js `fs` module

## Installation

```sh
npm install fs-fixture
```

## Quick start

```ts
import { createFixture } from 'fs-fixture'

// Create a temporary fixture
const fixture = await createFixture({
    'package.json': JSON.stringify({ name: 'my-app' }),
    'src/index.js': 'console.log("Hello world")'
})

// Read files
const content = await fixture.readFile('src/index.js', 'utf8')

// Cleanup when done
await fixture.rm()
```

### Auto cleanup with `using` keyword

Uses TypeScript 5.2+ [Explicit Resource Management](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) for automatic cleanup:

```ts
await using fixture = await createFixture({
    'config.json': '{ "setting": true }'
})

// Fixture is automatically cleaned up when exiting scope
```

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/fs-fixture">Development repo</a>!</sup></p>

## Usage

### Creating fixtures

**From an object:**
```ts
const fixture = await createFixture({
    'package.json': '{ "name": "test" }',
    'src/index.js': 'export default () => {}',
    'src/utils': {
        'helper.js': 'export const help = () => {}'
    }
})
```

**From a template directory:**
```ts
// Copies an existing directory structure
const fixture = await createFixture('./test-templates/basic')
```

**Empty fixture:**
```ts
// Create an empty temporary directory
const fixture = await createFixture()
```

### Working with files

File methods (`readFile`, `writeFile`, `readdir`) inherit their type signatures directly from Node.js `fs/promises`, preserving all overloads and type narrowing behavior.

**Read files:**
```ts
// Read as string (type: Promise<string>)
const text = await fixture.readFile('config.txt', 'utf8')

// Read as buffer (type: Promise<Buffer>)
const binary = await fixture.readFile('image.png')
```

**Write files:**
```ts
await fixture.writeFile('output.txt', 'Hello world')
await fixture.writeFile('data.bin', Buffer.from([0x89, 0x50]))
```

**JSON operations:**
```ts
// Write JSON with formatting
await fixture.writeJson('config.json', { port: 3000 })

// Read and parse JSON with type safety
type Config = { port: number }
const config = await fixture.readJson<Config>('config.json')
```

### Working with directories

```ts
// Create directories
await fixture.mkdir('nested/folders')

// List directory contents
const files = await fixture.readdir('src')

// Copy files into fixture
await fixture.cp('/path/to/file.txt', 'copied-file.txt')

// Move or rename files
await fixture.mv('old-name.txt', 'new-name.txt')
await fixture.mv('file.txt', 'src/file.txt')

// Check if path exists
if (await fixture.exists('optional-file.txt')) {
    // ...
}
```

### Advanced features

**Dynamic content with functions:**
```ts
const fixture = await createFixture({
    'target.txt': 'original file',
    'info.txt': ({ fixturePath }) => `Created at: ${fixturePath}`,
    'link.txt': ({ symlink }) => symlink('./target.txt')
})
```

**Binary files:**
```ts
const fixture = await createFixture({
    'image.png': Buffer.from(imageData),
    'generated.bin': () => Buffer.from('dynamic binary content')
})
```

**Path syntax:**
```ts
const fixture = await createFixture({
    // Nested object syntax
    src: {
        utils: {
            'helper.js': 'export const help = () => {}'
        }
    },

    // Or path syntax (creates same structure)
    'src/utils/helper.js': 'export const help = () => {}'
})
```

## API

### `createFixture(source?, options?)`

Creates a temporary fixture directory and returns a `FsFixture` instance.

**Parameters:**
- `source` (optional): String path to template directory, or `FileTree` object defining the structure
- `options.tempDir` (optional): Custom temp directory. Defaults to `os.tmpdir()`
- `options.templateFilter` (optional): Filter function when copying from template directory

**Returns:** `Promise<FsFixture>`

```ts
const fixture = await createFixture()
const fixture = await createFixture({ 'file.txt': 'content' })
const fixture = await createFixture('./template-dir')
const fixture = await createFixture({}, { tempDir: './custom-temp' })
```

### `FsFixture` Methods

| Method | Description |
|--------|-------------|
| `fixture.path` | Absolute path to the fixture directory |
| `getPath(...paths)` | Get absolute path to file/directory in fixture |
| `exists(path?)` | Check if file/directory exists |
| `rm(path?)` | Delete file/directory (or entire fixture if no path) |
| `readFile(path, encoding?)` | Read file as string or Buffer |
| `writeFile(path, content)` | Write string or Buffer to file |
| `readJson<T>(path)` | Read and parse JSON file |
| `writeJson(path, data, space?)` | Write JSON with optional formatting |
| `readdir(path, options?)` | List directory contents |
| `mkdir(path)` | Create directory (recursive) |
| `cp(source, dest?)` | Copy file/directory into fixture |
| `mv(source, dest)` | Move or rename file/directory |

### Types

<details>
<summary><strong>FileTree</strong></summary>

```ts
type FileTree = {
    [path: string]: string | Buffer | FileTree | ((api: Api) => string | Buffer | Symlink)
}

type Api = {
    fixturePath: string // Fixture root path
    filePath: string // Current file path
    getPath: (...paths: string[]) => string // Get path from fixture root
    symlink: (target: string) => Symlink // Create a symlink
}
```
</details>

## Related

### [manten](https://github.com/privatenumber/manten)

Lightweight testing library for Node.js
