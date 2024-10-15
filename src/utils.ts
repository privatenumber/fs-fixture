import fs from 'fs';
import os from 'os';

export const osTemporaryDirectory = fs.realpathSync(os.tmpdir());
export const directoryNamespace = `fs-fixture-${Date.now()}`;

let id = 0;
export const getId = () => {
	id += 1;
	return id;
};
