import fs from 'fs/promises';
import path from 'path';
import FsFixture from './fs-fixture.js';
import {
	temporaryDirectory,
	directoryNamespace,
	getId,
} from './utils';

export type { FsFixture };

type ApiBase = {
	fixturePath: string;
	getPath(subpath: string): string;
};

type Api = ApiBase & {
	filePath: string;
};

export type FileTree = {
	[path: string]: string | FileTree | ((api: Api) => string);
};

type File = {
	path: string;
	content: string;
};

const flattenFileTree = (
	fileTree: FileTree,
	pathPrefix: string,
	apiBase: ApiBase,
) => {
	const files: File[] = [];

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
			fileContent = fileContent(api);
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
) => {
	const fixturePath = path.join(temporaryDirectory, `${directoryNamespace}-${getId()}/`);

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
					// filter: source => !path.basename(source).startsWith('.'),
				},
			);
		} else if (typeof source === 'object') {
			// create from json
			const api: ApiBase = {
				fixturePath,
				getPath: subpath => path.join(fixturePath, subpath),
			};
			await Promise.all(
				flattenFileTree(source, fixturePath, api).map(async (file) => {
					await fs.mkdir(path.dirname(file.path), { recursive: true });
					await fs.writeFile(file.path, file.content);
				}),
			);
		}
	}

	return new FsFixture(fixturePath);
};
