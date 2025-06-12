import fs from 'node:fs';
import os from 'node:os';

export const osTemporaryDirectory = fs.realpathSync(os.tmpdir());

// PID because in Vitest, multiple processes start in parallel
export const directoryNamespace = `fs-fixture-${Date.now()}-${process.pid}`;

let id = 0;
export const getId = () => {
	id += 1;
	return id;
};
