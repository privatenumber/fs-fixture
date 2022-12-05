import fs from 'fs';
import os from 'os';

export const temporaryDirectory = fs.realpathSync(os.tmpdir());
export const directoryNamespace = `fs-fixture-${Date.now()}`;

let id = 0;
export function getId() {
	id += 1;
	return id;
}

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: any, key: string) => hasOwnProperty.call(object, key);
