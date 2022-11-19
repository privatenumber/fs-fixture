import path from 'path';
import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import FsFixture from './fs-fixture';
import { temporaryDirectory, hasOwn, getId } from './utils';

export type { FsFixture };

export type FileTree = {
	[path: string]: string | FileTree;
};

function flattenFileTree(
	fileTree: FileTree,
	pathPrefix: string,
) {
	const files: {
		path: string;
		content: string;
	}[] = [];

	for (const filePath in fileTree) {
		if (!hasOwn(fileTree, filePath)) {
			continue;
		}

		const fileContent = fileTree[filePath];
		if (typeof fileContent === 'string') {
			files.push({
				path: path.join(pathPrefix, filePath),
				content: fileContent,
			});
		} else { // Directory
			files.push(
				...flattenFileTree(fileContent, path.join(pathPrefix, filePath)),
			);
		}
	}

	return files;
}

export async function createFixture(
	source?: string | FileTree,
) {
	const fixturePath = path.join(temporaryDirectory, `fixture-${getId()}`);

	await fs.mkdir(fixturePath, {
		recursive: true,
	});

	if (source) {
		// create from directory path
		if (typeof source === 'string') {
			await copy(
				source,
				fixturePath,
			);
		} else if (typeof source === 'object') {
			// create from json
			await Promise.all(
				flattenFileTree(source, fixturePath).map(async (file) => {
					await fs.mkdir(path.dirname(file.path), { recursive: true });
					await fs.writeFile(file.path, file.content);
				}),
			);
		}
	}

	return new FsFixture(fixturePath);
}
