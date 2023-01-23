// @ts-check

import crypto from 'crypto';
import fs from 'fs';
import type { UserConfig } from 'vitest/config';
import { resolvePath } from '../tools/shared';

export const external = [
    'body-parser',
    'crypto',
    'express',
    'fs',
    'libxslt',
    'libxmljs',
    'module',
    'node:*',
    'node1-libxmljsmt-myh',
    'path',
    'playwright',
    'perf_hooks',
    'undici',
    'url',
    'vite-node',
    'vite',
    'vitest',
];

export const readFile = (path: string) =>
    fs.readFileSync(resolvePath(path), 'utf-8');

export const readJSON = (path: string) => {
    const json = readFile(path);

    return JSON.parse(json);
};

export const config = readJSON('./config/config.json');

const { version } = readJSON('./package.json');

export const PACKAGE_VERSION = version;

const xslForm = readFile('./src/xsl/openrosa2html5form.xsl');
const xslModel = readFile('./src/xsl/openrosa2xmlmodel.xsl');

const md5 = (message: string | Buffer) => {
    const hash = crypto.createHash('md5');
    hash.update(message);

    return hash.digest('hex');
};

const HASHED_VERSION = md5(`${xslForm}${xslModel}${PACKAGE_VERSION}`);

export const SERVER_PORT = config.port;

export const define = {
    [`PACKAGE${'_'}VERSION`]: JSON.stringify(PACKAGE_VERSION),
    [`HASHED${'_'}VERSION`]: JSON.stringify(HASHED_VERSION),
    [`SERVER${'_'}PORT`]: JSON.stringify(SERVER_PORT),
};

export const baseConfig = {
    assetsInclude: ['**/*.xml', '**/*.xsl'],
    build: {
        minify: false,
        outDir: 'dist',
        rollupOptions: {
            external,
        },
        sourcemap: true,
    },
    define,
    esbuild: {
        define,
        minifyIdentifiers: false,
        minifySyntax: false,
        minifyWhitespace: false,
    },
    optimizeDeps: {
        exclude: external,
    },
} satisfies UserConfig;
