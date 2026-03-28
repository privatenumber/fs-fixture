import path from 'node:path';
import type { FsPromises } from './fs-types.js';

type FsWithRm = FsPromises & Required<Pick<FsPromises, 'unlink' | 'rmdir'>>;

/**
 * Recursive removal using unlink/readdir/rmdir.
 * Fallback for fs implementations that don't support `rm`.
 * Caller must verify unlink and rmdir exist before calling.
 *
 * Strategy: try unlink first (handles files and symlinks including
 * symlinks to directories), fall back to readdir+rmdir for real directories.
 */
export const recursiveRm = async (
	fsApi: FsWithRm,
	targetPath: string,
): Promise<void> => {
	try {
		// unlink handles files and symlinks (including symlinks to directories)
		await fsApi.unlink(targetPath);
		return;
	} catch (error) {
		if (isEnoent(error)) {
			// Path doesn't exist — match rm({ force: true }) behavior
			return;
		}
		// EISDIR/EPERM — it's a real directory, fall through to recursive removal
	}

	const entries = await fsApi.readdir(targetPath, { withFileTypes: true });
	await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(targetPath, entry.name);
			return entry.isDirectory()
				? recursiveRm(fsApi, entryPath)
				: fsApi.unlink(entryPath);
		}),
	);
	await fsApi.rmdir(targetPath);
};

const isEnoent = (error: unknown) => (
	error instanceof Error
	&& 'code' in error
	&& error.code === 'ENOENT'
);
