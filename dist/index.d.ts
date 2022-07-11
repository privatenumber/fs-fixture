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
    Static method to create a fixture from a template directory.
    */
    static createFromTemplate(fromTemplatePath: string): Promise<FsFixture>;
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
    writeJson(filePath: string, json: any): Promise<void>;
    /**
    Read a file from the fixture directory.
    */
    readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer>;
}

declare type FileTree = {
    [path: string]: string | FileTree;
};
declare function createFixture(source: string | FileTree): Promise<FsFixture>;

export { FileTree, createFixture };
