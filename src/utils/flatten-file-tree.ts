import path from 'node:path';

class Path {
	path: string;

	constructor(filePath: string) {
		this.path = filePath;
	}
}

export class Directory extends Path {}

export class File extends Path {
	content: string;

	constructor(filePath: string, content: string) {
		super(filePath);
		this.content = content;
	}
}
type SymlinkType = 'file' | 'dir' | 'junction';

export class Symlink {
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
	[path: string]: string | FileTree | ((api: Api) => string | Symlink);
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
				result.path = filePath;
				files.push(result);
				continue;
			} else {
				fileContent = result;
			}
		}

		if (typeof fileContent === 'string') {
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
