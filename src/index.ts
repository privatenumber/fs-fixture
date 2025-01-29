import fs from 'node:fs/promises';
import type { CopyOptions } from 'node:fs';
import path from 'node:path';
import { FsFixture } from './fs-fixture.js';
import {
	osTemporaryDirectory,
	directoryNamespace,
	getId,
} from './utils';

export { type FsFixtureType as FsFixture } from './fs-fixture.js';

type FilterFunction = CopyOptions['filter'];

type SymlinkType = 'file' | 'dir' | 'junction';

class Symlink {
	target: string;

	type?: SymlinkType;

	path?: string;

	constructor(
		target: string,
		type?: SymlinkType,
	) {
		this.target = target;
		this.type = type;
	}
}

type ApiBase = {
	fixturePath: string;
	getPath(...subpaths: string[]): string;
	symlink(
		targetPath: string,

		/**
		 * Symlink type for Windows. Defaults to auto-detect by Node.
		 */
		type?: SymlinkType,
	): Symlink;
};

type Api = ApiBase & {
	filePath: string;
};

export type FileTree = {
	[path: string]: string | FileTree | ((api: Api) => string | Symlink);
};

type File = {
	path: string;
	content: string;
};

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

const flattenFileTree = (
	fileTree: FileTree,
	pathPrefix: string,
	apiBase: ApiBase,
) => {
	const files: (File | Symlink)[] = [];

	for (const subPath in fileTree) {
		if (!Object.hasOwn(fileTree, subPath)) {
			continue;
		}

		const filePath = path.join(pathPrefix, subPath);

		let fileContent = fileTree[subPath];
		if (typeof fileContent === 'function') {
			const api: Api = Object.assign(
				Object.create(apiBase),
				{ filePath },
			);
			const result = fileContent(api);
			if (result instanceof Symlink) {
				result.path = filePath;
				files.push(result);
				continue;
			} else {
				fileContent = result;
			}
		}

		if (typeof fileContent === 'string') {
			files.push({
				path: filePath,
				content: fileContent,
			});
		} else { // Directory
			files.push(
				...flattenFileTree(fileContent, filePath, apiBase),
			);
		}
	}

	return files;
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

	const filter = options?.templateFilter && new Proxy(options.templateFilter, {
		apply: (...args) => (args.at(-1)[0] === source ? () => false : Reflect.apply(...args)),
	});

	if (source) {
		// create from directory path
		if (typeof source === 'string') {
			await fs.cp(
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
			await Promise.all(
				flattenFileTree(source, fixturePath, api).map(async (file) => {
					await fs.mkdir(path.dirname(file.path!), { recursive: true });
					if (file instanceof Symlink) {
						await fs.symlink(file.target, file.path!, file.type);
					} else {
						await fs.writeFile(file.path, file.content);
					}
				}),
			);
		}
	}

	return new FsFixture(fixturePath);
};
