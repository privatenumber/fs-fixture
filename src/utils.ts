import fs from 'fs';
import path from 'path';
import os from 'os';

export const temporaryDirectory = path.join(fs.realpathSync(os.tmpdir()), 'test-fixtures', Date.now().toString());

let id = 0;
export function getId() {
	id += 1;
	return id;
}

const { hasOwnProperty } = Object.prototype;
export const hasOwn = (object: any, key: string) => hasOwnProperty.call(object, key);
