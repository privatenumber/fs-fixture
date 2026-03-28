/**
 * A subset of `fs/promises` methods used by FsFixture.
 * Compatible with Node.js `fs/promises`, `@platformatic/vfs`,
 * `memfs`, and other fs-compatible implementations.
 *
 * Pass a custom implementation to `createFixture({ fs })`
 * to use a virtual filesystem.
 */
export type FsPromises = {
	readFile: {
		(path: string, options?: { encoding?: null } | null): Promise<Buffer>;
		(
			path: string,
			options: BufferEncoding | { encoding: BufferEncoding },
		): Promise<string>;
	};
	writeFile(
		path: string,
		data: string | Buffer,
		options?: BufferEncoding | { encoding?: BufferEncoding } | null,
	): Promise<void>;
	readdir: {
		(path: string, options?: { withFileTypes?: false }): Promise<string[]>;
		(path: string, options: { withFileTypes: true }): Promise<
			Array<{
				name: string;
				isFile(): boolean;
				isDirectory(): boolean;
			}>
		>;
	};
	mkdir(
		path: string,
		options?: { recursive?: boolean },
	): Promise<string | undefined>;
	rename(oldPath: string, newPath: string): Promise<void>;
	access(path: string, mode?: number): Promise<void>;
	rm?(
		path: string,
		options?: {
			recursive?: boolean;
			force?: boolean;
		},
	): Promise<void>;
	unlink?(path: string): Promise<void>;
	rmdir?(path: string): Promise<void>;
	symlink?(
		target: string,
		path: string,
		type?: string | null,
	): Promise<void>;
	cp?(
		source: string,
		destination: string,
		options?: { recursive?: boolean },
	): Promise<void>;
	mkdtemp?(prefix: string): Promise<string>;
};
