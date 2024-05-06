import fs from 'fs/promises';
import path from 'path';
import FsFixture from './fs-fixture.js';
import {
	temporaryDirectory,
	directoryNamespace,
	getId,
} from './utils';

export type { FsFixture };

type Api = {
	fixturePath: string;
	getPath(subpath: string): string;
};

export type FileTree = {
	[path: string]: string | FileTree | ((api: Api) => string);
};

const flattenFileTree = (
	fileTree: FileTree,
	pathPrefix: string,
	api: Api,
) => {
	const files: {
		path: string;
		content: string;
	}[] = [];

	for (const filePath in fileTree) {
		if (!Object.hasOwn(fileTree, filePath)) {
			continue;
		}

		let fileContent = fileTree[filePath];

		if (typeof fileContent === 'function') {
			fileContent = fileContent(api);
		}

		if (typeof fileContent === 'string') {
			files.push({
				path: path.join(pathPrefix, filePath),
				content: fileContent,
			});
		} else { // Directory
			files.push(
				...flattenFileTree(fileContent, path.join(pathPrefix, filePath), api),
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
			const api: Api = {
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
