import { PathBase } from './path-base.js';

export class File extends PathBase {
	readonly content: string | Buffer;

	constructor(
		filePath: string,
		content: string | Buffer,
	) {
		super(filePath);
		this.content = content;
	}
}
