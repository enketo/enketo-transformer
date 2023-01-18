import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} path
 */
export const resolvePath = (path) => resolve(rootDir, path);
