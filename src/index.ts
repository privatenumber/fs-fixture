import fs from 'fs';
import path from 'path';
import FsFixture from './fs-fixture';
import { temporaryDirectory, hasOwn, getId } from './utils';

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
	source: string | FileTree,
) {
	// create from directory path
	if (typeof source === 'string') {
		return await FsFixture.createFromTemplate(source);
	}

	// create from json
	const fixturePath = path.join(temporaryDirectory, `fixture-${getId()}`);

	await Promise.all(
		flattenFileTree(source, fixturePath).map(async (file) => {
			await fs.promises.mkdir(path.dirname(file.path), { recursive: true });
			await fs.promises.writeFile(file.path, file.content);
		}),
	);

	return new FsFixture(fixturePath);
}
