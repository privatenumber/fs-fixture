import { PathBase } from './path-base.js';

export class File extends PathBase {
	constructor(
		filePath: string,
		readonly content: string | Buffer,
	) {
		super(filePath);
	}
}
