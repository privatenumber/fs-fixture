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

	private cleanUp = true;

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
	 * Move or rename a file or directory within the fixture.
	 * This is a wrapper around `node:fs/promises.rename`.
	 *
	 * @param sourcePath - The source path relative to the fixture root
	 * @param destinationPath - The destination path relative to the fixture root
	 * @returns Promise that resolves when the move is complete
	 *
	 * @example
	 * ```ts
	 * // Rename a file
	 * await fixture.mv('old-name.txt', 'new-name.txt')
	 *
	 * // Move a file into a directory
	 * await fixture.mv('file.txt', 'src/file.txt')
	 *
	 * // Rename a directory
	 * await fixture.mv('src', 'lib')
	 * ```
	 */
	mv(sourcePath: string, destinationPath: string) {
		return fs.rename(
			this.getPath(sourcePath),
			this.getPath(destinationPath),
		);
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
	 * Read the contents of a directory in the fixture.
	 *
	 * @param directoryPath - The directory path within the fixture to read.
	 *   Defaults to the fixture root when empty string is passed.
	 * @param options - Optional read directory options.
	 *   Use `{ withFileTypes: true }` to get Dirent objects.
	 * @returns Promise resolving to array of file/directory names or Dirent objects
	 */
	readdir: typeof fs.readdir = ((
		directoryPath: string,
		options?,
	) => fs.readdir(
		this.getPath(directoryPath || ''),
		options as any, // eslint-disable-line @typescript-eslint/no-explicit-any
	)) as typeof fs.readdir;

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
	 *
	 * @example
	 * ```ts
	 * const data = await fixture.readJson<{ name: string }>('config.json')
	 * console.log(data.name) // Typed as string
	 * ```
	 */
	async readJson<T = unknown>(filePath: string): Promise<T> {
		const content = await this.readFile(filePath, 'utf8');
		return JSON.parse(content) as T;
	}

	/**
	 * Create or overwrite a JSON file in the fixture directory.
	 *
	 * @param filePath - The JSON file path within the fixture to write
	 * @param json - The data to serialize as JSON
	 * @param space - Number of spaces or string to use for indentation. Defaults to 2.
	 * @returns Promise that resolves when file is written
	 *
	 * @example
	 * ```ts
	 * // Default 2-space indentation
	 * await fixture.writeJson('config.json', { key: 'value' })
	 *
	 * // 4-space indentation
	 * await fixture.writeJson('config.json', { key: 'value' }, 4)
	 *
	 * // Tab indentation
	 * await fixture.writeJson('config.json', { key: 'value' }, '\t')
	 *
	 * // Minified (no formatting)
	 * await fixture.writeJson('config.json', { key: 'value' }, 0)
	 * ```
	 */
	writeJson(filePath: string, json: unknown, space: string | number = 2) {
		return this.writeFile(
			filePath,
			JSON.stringify(json, null, space),
		);
	}

	debug(callback?: () => unknown | Promise<unknown>) {
		const debugMode = (error?: unknown) => {
			console.log(`Fixture path: ${this.path}`);
			this.cleanUp = false;
			if (error) {
				throw error;
			}
		};

		if (!callback) {
			return debugMode();
		}

		let result: unknown | Promise<unknown>;
		try {
			result = callback();
		} catch (error) {
			debugMode(error);
			return;
		}

		if (
			result !== null
			&& typeof result === 'object'
			&& 'catch' in result
			&& typeof result.catch === 'function'
		) {
			return result.catch(debugMode);
		}
	}

	/**
	 * Resource management cleanup
	 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html
	 */
	async [Symbol.asyncDispose]() {
		if (this.cleanUp) {
			await this.rm();
		}
	}
}

export type FsFixtureType = FsFixture;
