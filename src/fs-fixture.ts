import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';

// Polyfill for Node v18
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
	 * Path to the fixture directory.
	 */
	readonly path: string;

	/**
	 * Create a Fixture instance from a path. Does not create the fixture directory.
	 *
	 * @param fixturePath - The path to the fixture directory
	 */
	constructor(fixturePath: string) {
		this.path = fixturePath;
	}

	/**
	 * Get the full path to a subpath in the fixture directory.
	 *
	 * @param subpaths - Path segments to join with the fixture directory
	 * @returns The absolute path to the subpath
	 *
	 * @example
	 * ```ts
	 * fixture.getPath('dir', 'file.txt')
	 * // => '/tmp/fs-fixture-123/dir/file.txt'
	 * ```
	 */
	getPath(...subpaths: string[]) {
		return path.join(this.path, ...subpaths);
	}

	/**
	 * Check if the fixture exists. Pass in a subpath to check if it exists.
	 *
	 * @param subpath - Optional subpath to check within the fixture directory
	 * @returns Promise resolving to true if the path exists, false otherwise
	 */
	exists(subpath = '') {
		return fs.access(this.getPath(subpath)).then(
			() => true,
			() => false,
		);
	}

	/**
	 * Delete the fixture directory or a subpath within it.
	 *
	 * @param subpath - Optional subpath to delete within the fixture directory.
	 *   Defaults to deleting the entire fixture.
	 * @returns Promise that resolves when deletion is complete
	 */
	rm(subpath = '') {
		return fs.rm(this.getPath(subpath), {
			recursive: true,
			force: true,
		});
	}

	/**
	 * Copy a file or directory into the fixture directory.
	 *
	 * @param sourcePath - The source path to copy from
	 * @param destinationSubpath - Optional destination path within the fixture.
	 *   If omitted, uses the basename of sourcePath.
	 *   If ends with path separator, appends basename of sourcePath.
	 * @param options - Copy options (e.g., recursive, filter)
	 * @returns Promise that resolves when copy is complete
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
	 * Create a new folder in the fixture directory (including parent directories).
	 *
	 * @param folderPath - The folder path to create within the fixture
	 * @returns Promise that resolves when directory is created
	 */
	mkdir(folderPath: string) {
		return fs.mkdir(this.getPath(folderPath), {
			recursive: true,
		});
	}

	/**
	 * Read a file from the fixture directory.
	 *
	 * @param filePath - The file path within the fixture to read
	 * @param options - Optional encoding or read options.
	 *   When encoding is specified, returns a string; otherwise returns a Buffer.
	 * @returns Promise resolving to file contents as string or Buffer
	 */
	readFile: typeof fs.readFile = ((
		filePath: string,
		options?,
	) => fs.readFile(
		this.getPath(filePath),
		options as any, // eslint-disable-line @typescript-eslint/no-explicit-any
	)) as typeof fs.readFile;

	/**
	 * Create or overwrite a file in the fixture directory.
	 *
	 * @param filePath - The file path within the fixture to write
	 * @param data - The content to write (string or Buffer)
	 * @param options - Optional encoding or write options
	 * @returns Promise that resolves when file is written
	 */
	writeFile: typeof fs.writeFile = ((
		filePath: string,
		data: string | Buffer,
		...args
	) => fs.writeFile(
		this.getPath(filePath),
		data,
		...args as [any?], // eslint-disable-line @typescript-eslint/no-explicit-any
	)) as typeof fs.writeFile;

	/**
	 * Read and parse a JSON file from the fixture directory.
	 *
	 * @param filePath - The JSON file path within the fixture to read
	 * @returns Promise resolving to the parsed JSON content
	 */
	async readJson(filePath: string) {
		const content = await this.readFile(filePath, 'utf8');
		return JSON.parse(content) as unknown;
	}

	/**
	 * Create or overwrite a JSON file in the fixture directory.
	 *
	 * @param filePath - The JSON file path within the fixture to write
	 * @param json - The data to serialize as JSON (with 2-space indentation)
	 * @returns Promise that resolves when file is written
	 */
	writeJson(filePath: string, json: unknown) {
		return this.writeFile(
			filePath,
			JSON.stringify(json, null, 2),
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
