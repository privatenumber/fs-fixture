import path from 'node:path';
import { Directory } from './directory.js';
import { File } from './file.js';
import { Symlink, type SymlinkType } from './symlink.js';

export { Directory, File, Symlink };

export type ApiBase = {
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
	[path: string]: string | Buffer | FileTree | ((api: Api) => string | Buffer | Symlink);
};

export const flattenFileTree = (
	fileTree: FileTree,
	pathPrefix: string,
	apiBase: ApiBase,
) => {
	const files: (File | Directory | Symlink)[] = [];

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
				const symlink = new Symlink(result.target, result.type, filePath);
				files.push(symlink);
				continue;
			} else {
				fileContent = result;
			}
		}

		if (typeof fileContent === 'string' || Buffer.isBuffer(fileContent)) {
			files.push(new File(filePath, fileContent));
		} else {
			// Directory
			files.push(
				new Directory(filePath),
				...flattenFileTree(fileContent, filePath, apiBase),
			);
		}
	}

	return files;
};
