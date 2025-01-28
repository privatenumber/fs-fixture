<p align="center">
	<img width="160" src=".github/logo.webp">
</p>
<h1 align="center">
	<sup>fs-fixture</sup>
	<br>
	<a href="https://npm.im/fs-fixture"><img src="https://badgen.net/npm/v/fs-fixture"></a> <a href="https://npm.im/fs-fixture"><img src="https://badgen.net/npm/dm/fs-fixture"></a>
</h1>

Simple API to create disposable test fixtures on disk.

Tiny (`560 B` gzipped) and no dependencies!

### Example
```ts
import fs from 'fs/promises'
import { createFixture } from 'fs-fixture'

const fixture = await createFixture({
    'dir-a': {
        'file-b': 'hello world'
    }
})

const content = await fs.readFile(fixture.getPath('dir-a/file-b'))
console.log(content)
```

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/fs-fixture">Development repo</a>!</sup></p>

## Usage

Pass in an object representing the file structure:

```ts
import { createFixture } from 'fs-fixture'

const fixture = await createFixture({
    // Nested directory syntax
    'dir-a': {
        'file-a.txt': 'hello world',
        'dir-b': {
            'file-b.txt': ({ fixturePath }) => `Fixture path: ${fixturePath}`,
            'symlink-c': ({ symlink }) => symlink('../file-a.txt')
        }
    },

    // Alternatively, use the directory path syntax - Same as above
    'dir-a/dir-b/file-b.txt': 'goodbye world'
})

// Interact with the fixture
console.log(fixture.path)

// Cleanup fixture
await fixture.rm()
```

### Template path input

Pass in a path to a test fixture template directory to make a copy of it.

```ts
// Pass in a path to a fixture template path, and it will make a copy of it
const fixture = await createFixture('./fixtures/template-a')

/* Your test code here... */

// Cleanup fixture
await fixture.rm()
```

### `using` keyword (Explicit Resource Management)

[TypeScript 5.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) supports the [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) feature, which allows you to instantiate the fixture via `using`. When the fixture is declared this way, it gets automatically cleaned up when exiting the scope.

```ts
await using fixture = await createFixture({ file: 'hello' })

// No need to run fixture.rm()
```

## API

### createFixture(source, options)

An async function that creates a fixture from the `source` you pass in, and returns a `FsFixture` instance.

#### source
Type: `string | FileTree`

Path to a template fixture path, or a `FileTree` object that represents the fixture content.


#### options

##### tempDir

Type: `string`

Default: `os.tmpdir()`

The directory where the fixture will be created.


##### templateFilter

Type: `(source: string, destination: string) => boolean | Promise<boolean>`

Function to filter files to copy when using a template path. Return `true` to copy the item, `false` to ignore it.

### Types
#### FileTree

```ts
type FileTree = {
    [path: string]: string | FileTree | ((api: Api) => string)
}

type Api = {
    // Fixture root path
    fixturePath: string

    // Current file path
    filePath: string

    // Get path from the root of the fixture
    getPath: (...subpaths: string[]) => string

    // Create a symlink
    symlink: (target: string) => Symlink
}
```

#### FsFixture

```ts
class FsFixture {
    /**
    Path to the fixture directory.
    */
    readonly path: string

    /**
    Create a Fixture instance from a path. Does not create the fixture directory.
    */
    constructor(fixturePath: string)

    /**
    Get the full path to a subpath in the fixture directory.
    */
    getPath(...subpaths: string[]): string

    /**
    Check if the fixture exists. Pass in a subpath to check if it exists.
    */
    exists(subpath?: string): Promise<boolean>

    /**
    Delete the fixture directory. Pass in a subpath to delete it.
    */
    rm(subpath?: string): Promise<void>

    /**
    Copy a file to the fixture directory. Pass in a subpath destination.
    */
    copyFile(filePath: string, subpath?: string): Promise<void>

    /**
    Create a file in the fixture directory.
    */
    writeFile(filePath: string, content: string): Promise<void>

    /**
    Create a JSON file in the fixture directory.
    */
    writeJson(filePath: string, json: unknown): Promise<void>

    /**
    Read a file from the fixture directory.
    */
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer>
}
```

## Related

### [manten](https://github.com/privatenumber/manten)

Lightweight testing library for Node.js
