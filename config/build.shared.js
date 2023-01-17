// @ts-check

import fs from 'fs';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

export const config = require('./config.json');

export const external = [
    'body-parser',
    'crypto',
    'css.escape',
    'express',
    'fs',
    'language-tags',
    'libxslt',
    'node1-libxmljsmt-myh',
    'path',
    'string-direction',
    'undici',
    'url',
    'vite-node',
    'vite',
];

export const rootDir = dirname(fileURLToPath(import.meta.url)).replace(
    /(\/enketo-transformer)(\/.*$)/,
    '$1'
);

/**
 * @param {string} path
 */
export const resolvePath = (path) => resolve(rootDir, path);

/**
 * @param {string} path
 */
export const readFile = (path) => fs.readFileSync(resolvePath(path), 'utf-8');
