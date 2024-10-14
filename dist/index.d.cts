declare class FsFixture {
    /**
    Path to the fixture directory.
    */
    readonly path: string;
    /**
    Create a Fixture instance from a path. Does not create the fixture directory.
    */
    constructor(fixturePath: string);
    /**
    Get the full path to a subpath in the fixture directory.
    */
    getPath(...subpaths: string[]): string;
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
type FsFixtureType = FsFixture;

type SymlinkType = 'file' | 'dir' | 'junction';
declare class Symlink {
    target: string;
    type?: SymlinkType;
    path?: string;
    constructor(target: string, type?: SymlinkType);
}
type ApiBase = {
    fixturePath: string;
    getPath(...subpaths: string[]): string;
    symlink(targetPath: string, 
    /**
     * Symlink type for Windows. Defaults to auto-detect by Node.
     */
    type?: SymlinkType): Symlink;
};
type Api = ApiBase & {
    filePath: string;
};
type FileTree = {
    [path: string]: string | FileTree | ((api: Api) => string | Symlink);
};
declare const createFixture: (source?: string | FileTree) => Promise<FsFixture>;

export { type FileTree, type FsFixtureType as FsFixture, createFixture };
