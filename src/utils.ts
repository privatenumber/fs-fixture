import fs from 'node:fs';
import os from 'node:os';

export const osTemporaryDirectory = fs.realpathSync(os.tmpdir());
export const directoryNamespace = `fs-fixture-${Date.now()}`;

let id = 0;
export const getId = () => {
	id += 1;
	return id;
};
