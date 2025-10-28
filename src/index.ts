import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FsFixture } from './fs-fixture.js';
import { osTemporaryDirectory } from './utils/temporary-directory.js';
import {
	type FileTree, type ApiBase, flattenFileTree, Directory, File, Symlink,
} from './utils/flatten-file-tree.js';

export { type FileTree };
export { type FsFixtureType as FsFixture } from './fs-fixture.js';

type FilterFunction = CopyOptions['filter'];

export type CreateFixtureOptions = {

	/**
	 * The temporary directory to create the fixtures in.
	 * Defaults to `os.tmpdir()`.
	 *
	 * Accepts either a string path or a URL object.
	 *
	 * Tip: use `new URL('.', import.meta.url)` to the get the file's directory (not the file).
	 */
	tempDir?: string | URL;

	/**
	 * Function to filter files to copy when using a template path.
	 * Return `true` to copy the item, `false` to ignore it.
	 */
	templateFilter?: FilterFunction;
};

/**
 * Create a temporary test fixture directory.
 *
 * @param source - Optional source to create the fixture from:
 *   - If omitted, creates an empty fixture directory
 *   - If a string, copies the directory at that path to the fixture
 *   - If a FileTree object, creates files and directories from the object structure
 * @param options - Optional configuration for fixture creation
 * @returns Promise resolving to an FsFixture instance
 *
 * @example
 * ```ts
 * // Create empty fixture
 * const fixture = await createFixture()
 *
 * // Create from object
 * const fixture = await createFixture({
 *   'file.txt': 'content',
 *   'dir/nested.txt': 'nested content',
 *   'binary.bin': Buffer.from('binary'),
 * })
 *
 * // Create from template directory
 * const fixture = await createFixture('./my-template')
 *
 * // Cleanup
 * await fixture.rm()
 * ```
 */
export const createFixture = async (
	source?: string | FileTree,
	options?: CreateFixtureOptions,
) => {
	const resolvedTemporaryDirectory = options?.tempDir
		? path.resolve(
			typeof options.tempDir === 'string'
				? options.tempDir
				: fileURLToPath(options.tempDir),
		)
		: osTemporaryDirectory;

	// Ensure parent directory exists when using custom tempDir
	if (options?.tempDir) {
		await fs.mkdir(resolvedTemporaryDirectory, { recursive: true });
	}

	const fixturePath = await fs.mkdtemp(
		path.join(resolvedTemporaryDirectory, 'fs-fixture-'),
	);

	if (source) {
		// create from directory path
		if (typeof source === 'string') {
			await fs.cp(
				source,
				fixturePath,
				{
					recursive: true,
					filter: options?.templateFilter,
				},
			);
		} else if (typeof source === 'object') {
			// create from json
			const api: ApiBase = {
				fixturePath,
				getPath: (...subpaths) => path.join(fixturePath, ...subpaths),
				symlink: (targetPath, type) => new Symlink(targetPath, type),
			};
			const flatTree = flattenFileTree(source, fixturePath, api);

			// 1. Create all directories first
			await Promise.all(
				flatTree
					.filter((file): file is Directory => file instanceof Directory)
					.map(file => fs.mkdir(file.path, { recursive: true })),
			);

			// 2. Create all files and symlinks in parallel
			await Promise.all(
				flatTree.map(async (file) => {
					if (file instanceof Symlink) {
						await fs.symlink(file.target, file.path!, file.type);
					} else if (file instanceof File) {
						await fs.writeFile(file.path, file.content);
					}
				}),
			);
		}
	}

	return new FsFixture(fixturePath);
};
