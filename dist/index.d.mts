declare class FsFixture {
    /**
    Path to the fixture directory.
    */
    path: string;
    /**
    Create a Fixture instance from a path. Does not create the fixture directory.
    */
    constructor(fixturePath: string);
    /**
    Get the full path to a subpath in the fixture directory.
    */
    getPath(subpath: string): string;
    /**
    Check if the fixture exists. Pass in a subpath to check if it exists.
    */
    exists(subpath?: string): Promise<boolean>;
    /**
    Delete the fixture directory. Pass in a subpath to delete it.
    */
    rm(subpath?: string): Promise<void>;
    /**
    Create a file in the fixture directory.
    */
    writeFile(filePath: string, content: string): Promise<void>;
    /**
    Create a JSON file in the fixture directory.
    */
    writeJson(filePath: string, json: unknown): Promise<void>;
    /**
    Read a file from the fixture directory.
    */
    readFile(filePath: string, encoding?: null): Promise<Buffer>;
    readFile(filePath: string, encoding: BufferEncoding): Promise<string>;
    /**
     * Resource management cleanup
     * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html
     */
    [Symbol.asyncDispose](): Promise<void>;
}

type FileTree = {
    [path: string]: string | FileTree;
};
declare const createFixture: (source?: string | FileTree) => Promise<FsFixture>;

export { type FileTree, FsFixture, createFixture };
