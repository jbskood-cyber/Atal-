import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../.tmp/core-tests');

export function loadCore(relativePath) {
  return require(resolve(root, relativePath));
}
