import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FsFixture } from './fs-fixture.js';
import type { FsPromises } from './utils/fs-types.js';
import { osTemporaryDirectory } from './utils/temporary-directory.js';
import {
	type FileTree, type ApiBase, flattenFileTree, Directory, File, Symlink,
} from './utils/flatten-file-tree.js';

export { type FileTree };
export { type FsPromises } from './utils/fs-types.js';
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

	/**
	 * Custom fs/promises-compatible API for fixture operations.
	 * Use this to create fixtures in a virtual filesystem instead of on disk.
	 *
	 * Required: readFile, writeFile, readdir (with withFileTypes),
	 * mkdir, rename, access.
	 * Optional: rm (or unlink + rmdir as fallback), symlink, cp, mkdtemp.
	 *
	 * @example
	 * ```ts
	 * import { create, MemoryProvider } from '@platformatic/vfs'
	 * const vfs = create(new MemoryProvider())
	 * const fixture = await createFixture({ 'file.txt': 'hi' }, { fs: vfs.promises })
	 * ```
	 */
	fs?: FsPromises;
};

let fixtureCounter = 0;

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
	const fsApi = options?.fs ?? fs;

	const resolvedTemporaryDirectory = options?.tempDir
		? path.resolve(
			typeof options.tempDir === 'string'
				? options.tempDir
				: fileURLToPath(options.tempDir),
		)
		: osTemporaryDirectory;

	// Ensure parent directory exists when using custom tempDir
	if (options?.tempDir) {
		await fsApi.mkdir(resolvedTemporaryDirectory, { recursive: true });
	}

	// Generate unique fixture path
	let fixturePath: string;
	if (fsApi.mkdtemp) {
		fixturePath = await fsApi.mkdtemp(
			path.join(resolvedTemporaryDirectory, 'fs-fixture-'),
		);
	} else {
		// Fallback for fs implementations without mkdtemp
		fixtureCounter += 1;
		fixturePath = path.join(
			resolvedTemporaryDirectory,
			`fs-fixture-${process.pid}-${fixtureCounter}`,
		);
		await fsApi.mkdir(fixturePath, { recursive: true });
	}

	const filter = options?.templateFilter && new Proxy(options.templateFilter, {
		apply: (...args) => (args.at(-1)[0] === source ? () => false : Reflect.apply(...args)),
	});

	if (source) {
		// create from directory path
		if (typeof source === 'string') {
			if (!fsApi.cp) {
				throw new TypeError(
					'Template directory sources require the fs API to support cp()',
				);
			}
			await fsApi.cp(
				source,
				fixturePath,
				{
					recursive: true,
					filter,
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
			// (explicit directories + parent directories of files/symlinks)
			const directories = new Set<string>();

			for (const file of flatTree) {
				if (file instanceof Directory) {
					directories.add(file.path);
				} else if (file instanceof File || file instanceof Symlink) {
					// Ensure parent directory exists
					directories.add(path.dirname(file.path!));
				}
			}

			await Promise.all(
				Array.from(directories).map(
					directory => fsApi.mkdir(directory, { recursive: true }),
				),
			);

			// 2. Create all files and symlinks in parallel
			const hasSymlinks = flatTree.some(file => file instanceof Symlink);
			if (hasSymlinks && !fsApi.symlink) {
				throw new TypeError(
					'Symlinks require the fs API to support symlink()',
				);
			}

			await Promise.all(
				flatTree.map(async (file) => {
					if (file instanceof Symlink) {
						await fsApi.symlink!(file.target, file.path!, file.type);
					} else if (file instanceof File) {
						await fsApi.writeFile(file.path, file.content);
					}
				}),
			);
		}
	}

	return new FsFixture(fixturePath, options?.fs);
};
