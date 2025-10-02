import { PathBase } from './path-base.js';

export type SymlinkType = 'file' | 'dir' | 'junction';

export class Symlink extends PathBase {
	constructor(
		readonly target: string,
		readonly type?: SymlinkType,
		filePath?: string,
	) {
		super(filePath ?? '');
	}
}
