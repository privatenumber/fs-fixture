import fs from 'fs/promises';
import path from 'path';

class FsFixture {
	/**
	Path to the fixture directory.
	*/
	path: string;

	/**
	Create a Fixture instance from a path. Does not create the fixture directory.
	*/
	constructor(fixturePath: string) {
		this.path = fixturePath;
	}

	/**
	Get the full path to a subpath in the fixture directory.
	*/
	getPath(subpath: string) {
		return path.join(this.path, subpath);
	}

	/**
	Check if the fixture exists. Pass in a subpath to check if it exists.
	*/
	exists(subpath = '') {
		return fs.access(this.getPath(subpath)).then(
			() => true,
			() => false,
		);
	}

	/**
	Delete the fixture directory. Pass in a subpath to delete it.
	*/
	rm(subpath = '') {
		return fs.rm(this.getPath(subpath), {
			recursive: true,
			force: true,
		});
	}

	/**
	Create a file in the fixture directory.
	*/
	writeFile(filePath: string, content: string) {
		return fs.writeFile(
			this.getPath(filePath),
			content,
		);
	}

	/**
	Create a JSON file in the fixture directory.
	*/
	writeJson(filePath: string, json: unknown) {
		return this.writeFile(
			filePath,
			JSON.stringify(json, null, 2),
		);
	}

	/**
	Read a file from the fixture directory.
	*/
	readFile(filePath: string, encoding?: BufferEncoding) {
		return fs.readFile(
			this.getPath(filePath),
			encoding,
		);
	}
}

export default FsFixture;
