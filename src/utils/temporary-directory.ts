import fs from 'node:fs';
import os from 'node:os';

export const osTemporaryDirectory = fs.realpathSync(os.tmpdir());
