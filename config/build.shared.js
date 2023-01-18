// @ts-check

import crypto from 'crypto';
import fs from 'fs';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

export const config = require('./config.json');

export const external = [
    'body-parser',
    'crypto',
    'express',
    'fs',
    'libxslt',
    'libxmljs',
    'module',
    'node1-libxmljsmt-myh',
    'path',
    'playwright',
    'undici',
    'url',
    'vite-node',
    'vite',
    'vitest',
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

const { version } = require('../package.json');

export const PACKAGE_VERSION = version;

const xslForm = readFile('./src/xsl/openrosa2html5form.xsl');
const xslModel = readFile('./src/xsl/openrosa2xmlmodel.xsl');

/**
 * @param {string | Buffer} message
 */
const md5 = (message) => {
    const hash = crypto.createHash('md5');
    hash.update(message);

    return hash.digest('hex');
};

const HASHED_VERSION = md5(`${xslForm}${xslModel}${PACKAGE_VERSION}`);

export const SERVER_PORT = config.port;

export const define = {
    PACKAGE_VERSION: JSON.stringify(PACKAGE_VERSION),
    HASHED_VERSION: JSON.stringify(HASHED_VERSION),
    SERVER_PORT: JSON.stringify(SERVER_PORT),
};

/**
 * @type {import('vitest/config').UserConfig}
 */
export const baseConfig = {
    assetsInclude: ['**/*.xml', '**/*.xsl'],
    build: {
        minify: false,
        outDir: 'dist',
        sourcemap: true,
    },
    define,
    esbuild: {
        define,
        minifyIdentifiers: false,
        minifySyntax: false,
        minifyWhitespace: false,
    },
    server: {
        port: SERVER_PORT,
    },
};
