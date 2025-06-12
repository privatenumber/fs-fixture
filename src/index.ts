import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';
import { FsFixture } from './fs-fixture.js';
import {
	osTemporaryDirectory,
	directoryNamespace,
	getId,
} from './utils/temporary-directory.js';
import {
	type FileTree, type ApiBase, flattenFileTree, Directory, File, Symlink,
} from './utils/flatten-file-tree.js';

export { type FsFixtureType as FsFixture } from './fs-fixture.js';

type FilterFunction = CopyOptions['filter'];

export type CreateFixtureOptions = {

	/**
	 * The temporary directory to create the fixtures in.
	 * Defaults to `os.tmpdir()`.
	 */
	tempDir?: string;

	/**
	 * Function to filter files to copy when using a template path.
	 * Return `true` to copy the item, `false` to ignore it.
	 */
	templateFilter?: FilterFunction;
};

export const createFixture = async (
	source?: string | FileTree,
	options?: CreateFixtureOptions,
) => {
	const resolvedTemporaryDirectory = options?.tempDir
		? path.resolve(options.tempDir)
		: osTemporaryDirectory;

	const fixturePath = path.join(resolvedTemporaryDirectory, `${directoryNamespace}-${getId()}/`);

	await fs.mkdir(fixturePath, {
		recursive: true,
	});

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
			await Promise.all(
				flattenFileTree(source, fixturePath, api).map(async (file) => {
					if (file instanceof Directory) {
						await fs.mkdir(file.path, { recursive: true });
					} else if (file instanceof Symlink) {
						await fs.mkdir(path.dirname(file.path!), { recursive: true });
						await fs.symlink(file.target, file.path!, file.type);
					} else if (file instanceof File) {
						await fs.mkdir(path.dirname(file.path!), { recursive: true });
						await fs.writeFile(file.path, file.content);
					}
				}),
			);
		}
	}

	return new FsFixture(fixturePath);
};
