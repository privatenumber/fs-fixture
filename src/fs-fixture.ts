import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';

if (typeof Symbol.asyncDispose !== 'symbol') {
	Object.defineProperty(Symbol, 'asyncDispose', {
		configurable: false,
		enumerable: false,
		writable: false,
		value: Symbol.for('asyncDispose'),
	});
}

export class FsFixture {
	/**
	Path to the fixture directory.
	*/
	readonly path: string;

	/**
	Create a Fixture instance from a path. Does not create the fixture directory.
	*/
	constructor(fixturePath: string) {
		this.path = fixturePath;
	}

	/**
	Get the full path to a subpath in the fixture directory.
	*/
	getPath(...subpaths: string[]) {
		return path.join(this.path, ...subpaths);
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
	Copy a path into the fixture directory.
	*/
	cp(
		sourcePath: string,
		destinationSubpath?: string,
		options?: CopyOptions,
	) {
		if (!destinationSubpath) {
			destinationSubpath = path.basename(sourcePath);
		} else if (destinationSubpath.endsWith(path.sep)) {
			destinationSubpath += path.basename(sourcePath);
		}

		return fs.cp(
			sourcePath,
			this.getPath(destinationSubpath),
			options,
		);
	}

	/**
	Create an empty folder in the fixture directory.
	*/
	mkdir(folderPath: string) {
		return fs.mkdir(this.getPath(folderPath), {
			recursive: true,
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
	readFile(
		filePath: string,
		encoding?: null,
	): Promise<Buffer>;

	readFile(
		filePath: string,
		encoding: BufferEncoding,
	): Promise<string>;

	readFile(
		filePath: string,
		encoding?: BufferEncoding | null,
	) {
		return fs.readFile(
			this.getPath(filePath),
			encoding,
		);
	}

	/**
	 * Resource management cleanup
	 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html
	 */
	async [Symbol.asyncDispose]() {
		await this.rm();
	}
}

export type FsFixtureType = FsFixture;
