import { PathBase } from './path-base.js';

export type SymlinkType = 'file' | 'dir' | 'junction';

export class Symlink extends PathBase {
	readonly target: string;

	readonly type?: SymlinkType;

	constructor(
		target: string,
		type?: SymlinkType,
		filePath?: string,
	) {
		super(filePath ?? '');
		this.target = target;
		this.type = type;
	}
}
