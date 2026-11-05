import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FsFixture, type FsFixtureType } from './fs-fixture.js';
import type { FsPromises } from './utils/fs-types.js';
import { osTemporaryDirectory } from './utils/temporary-directory.js';
import {
	type FileTree, type ApiBase, flattenFileTree, Directory, File, Symlink,
} from './utils/flatten-file-tree.js';

export { type FileTree };
export { type FsPromises } from './utils/fs-types.js';
export { type FsFixtureType as FsFixture } from './fs-fixture.js';

type FilterFunction = CopyOptions['filter'];

/**
 * Initialize a fixture with complex, imperative, or ordered setup.
 *
 * The initializer receives the live fixture and can return a FileTree.
 * fs-fixture creates that tree after setup completes.
 */
export type FixtureInitializer = (
	fixture: FsFixtureType,
) => void | FileTree | Promise<void | FileTree>;

type FixtureSource = string | FileTree | FixtureInitializer;

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

const createFileTree = async (
	fileTree: FileTree,
	fixture: FsFixtureType,
) => {
	const api: ApiBase = {
		fixturePath: fixture.path,
		getPath: (...subpaths) => fixture.getPath(...subpaths),
		symlink: (targetPath, type) => new Symlink(targetPath, type),
	};
	const flatTree = flattenFileTree(fileTree, fixture.path, api);

	// Create explicit and implicit parent directories before writing files in parallel.
	const directories = new Set<string>();

	for (const file of flatTree) {
		if (file instanceof Directory) {
			directories.add(file.path);
		} else if (file instanceof File || file instanceof Symlink) {
			directories.add(path.dirname(file.path!));
		}
	}

	await settleAll(
		Array.from(directories).map(
			directory => fixture.fs.mkdir(directory, { recursive: true }),
		),
	);

	const hasSymlinks = flatTree.some(file => file instanceof Symlink);
	if (hasSymlinks && !fixture.fs.symlink) {
		throw new TypeError(
			'Symlinks require the fs API to support symlink()',
		);
	}

	await settleAll(
		flatTree.map(async (file) => {
			if (file instanceof Symlink) {
				await fixture.fs.symlink!(file.target, file.path!, file.type);
			} else if (file instanceof File) {
				await fixture.fs.writeFile(file.path, file.content);
			}
		}),
	);
};

// Promise.all() rejects before sibling filesystem operations settle, racing cleanup.
// Promise.allSettled() waits but does not rethrow failures, so report every failure here.
const settleAll = async (operations: Promise<unknown>[]) => {
	const results = await Promise.allSettled(operations);
	const errors: unknown[] = [];

	for (const result of results) {
		if (result.status === 'rejected') {
			errors.push(result.reason);
		}
	}

	if (errors.length === 1) {
		throw errors[0];
	}

	if (errors.length > 1) {
		throw new AggregateError(errors, 'Failed to initialize fixture');
	}
};

const cleanupFixture = async (fixture: FsFixtureType) => {
	// Catch both synchronous throws and asynchronous rejections from cleanup.
	try {
		await fixture.rm();
	} catch {
		// The initialization error takes precedence over cleanup failures.
	}
};

const initializeFixture = async (
	source: FixtureSource | undefined,
	fixture: FsFixtureType,
	templateFilter: FilterFunction | undefined,
) => {
	if (!source) {
		return;
	}

	if (typeof source === 'string') {
		if (!fixture.fs.cp) {
			throw new TypeError(
				'Template directory sources require the fs API to support cp()',
			);
		}
		await fixture.fs.cp(source, fixture.path, {
			recursive: true,
			filter: templateFilter,
		});
		return;
	}

	if (typeof source === 'function') {
		const fileTree = await source(fixture);
		if (fileTree) {
			await createFileTree(fileTree, fixture);
		}
		return;
	}

	await createFileTree(source, fixture);
};

const createFixturePath = async (
	fsApi: FsPromises,
	tempDir: string | URL | undefined,
) => {
	const temporaryDirectory = tempDir
		? path.resolve(typeof tempDir === 'string' ? tempDir : fileURLToPath(tempDir))
		: osTemporaryDirectory;

	if (tempDir) {
		await fsApi.mkdir(temporaryDirectory, { recursive: true });
	}

	if (fsApi.mkdtemp) {
		return fsApi.mkdtemp(path.join(temporaryDirectory, 'fs-fixture-'));
	}

	fixtureCounter += 1;
	const fixturePath = path.join(
		temporaryDirectory,
		`fs-fixture-${process.pid}-${fixtureCounter}`,
	);
	await fsApi.mkdir(fixturePath, { recursive: true });
	return fixturePath;
};

/**
 * Create a temporary test fixture directory.
 *
 * @param source - Optional source to create the fixture from:
 *   - If omitted, creates an empty fixture directory
 *   - If a string, copies the directory at that path to the fixture
 *   - If a FileTree object, creates files and directories from the object structure
 *   - If an initializer function, performs setup and can return a FileTree to create afterward
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
	source?: FixtureSource,
	options?: CreateFixtureOptions,
) => {
	const fsApi = options?.fs ?? fs;
	const fixturePath = await createFixturePath(fsApi, options?.tempDir);
	const fixture = new FsFixture(fixturePath, options?.fs);

	try {
		await initializeFixture(source, fixture, options?.templateFilter);
	} catch (error) {
		await cleanupFixture(fixture);
		throw error;
	}

	return fixture;
};
