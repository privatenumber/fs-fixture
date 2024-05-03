# fs-fixture [![Latest version](https://badgen.net/npm/v/fs-fixture)](https://npm.im/fs-fixture) [![npm downloads](https://badgen.net/npm/dm/fs-fixture)](https://npm.im/fs-fixture)

Simple API to create disposable test fixtures on disk.

Tiny (`560 B` gzipped) and no dependencies!

### Example
```ts
import { createFixture } from 'fs-fixture'

const fixture = await createFixture({
    'dir-a': {
        'file-b': 'hello world'
    }
})

console.log(fixture.path)
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
    directoryA: {
        directoryB: {
            fileNameA: 'fileContent'
        }
    },

    // Alternatively, use the directory path syntax - Same as above
    'directoryA/directoryB/fileNameB': 'fileContent'
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

## API

### createFixture(source)

An async function that creates a fixture from the `source` you pass in, and returns a `FsFixture` instance.

#### source
Type: `string | FileTree`

Path to a template fixture path, or a `FileTree` object that represents the fixture content.


### Types
#### FileTree

```ts
type FileTree = {
    [path: string]: string | FileTree
}
```

#### FsFixture

```ts
class FsFixture {
    /**
    Path to the fixture directory.
    */
    path: string

    /**
    Create a Fixture instance from a path. Does not create the fixture directory.
    */
    constructor(fixturePath: string)

    /**
    Check if the fixture exists. Pass in a subpath to check if it exists.
    */
    exists(subpath?: string): Promise<boolean>

    /**
    Delete the fixture directory. Pass in a subpath to delete it.
    */
    rm(subpath?: string): Promise<void>

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
