# fs-fixture

Easily create test fixtures at a temporary file-system path.

<sub>Support this project by ⭐️ starring and sharing it. [Follow me](https://github.com/privatenumber) to see what other cool projects I'm working on! ❤️</sub>

## Usage

### JSON input

Pass in an object representing the test fixture.

```ts
import { createFixture } from 'fs-fixture'

test('my test using json fixture', async () => {
    // Pass in a JSON representing the test fixture
    const fixture = await createFixture({
        // Nested directory syntax
        directoryA: {
            directoryB: {
                fileNameA: 'fileContent'
            }
        },

        // Directory path syntax - Same as above
        'directoryA/directoryB/fileNameB': 'fileContent'
    })

    /*
    Your test code here...

    // Log fixture path
    console.log(fixture.path)

    // Check if relative path exists
    console.log(await fixture.exists('./file'))
    */

    // Cleanup fixture
    await fixture.rm()
})
```

### Template path input

Pass in a path to a test fixture template directory to make a copy of it.

```ts
test('my test using template path', async () => {
    // Pass in a path to a fixture template path, and it will make a copy of it
    const fixture = await createFixture('./fixtures/template-a')

    /* Your test code here... */

    // Cleanup fixture
    await fixture.rm()
})
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
    writeJson(filePath: string, json: any): Promise<void>

    /**
    Read a file from the fixture directory.
    */
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer>
}
```

## Related

### [manten](https://github.com/privatenumber/manten)

Lightweight testing library for Node.js
