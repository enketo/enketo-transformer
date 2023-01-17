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

export const ENV = process.env.NODE_ENV ?? 'production';

export const define = {
    ENV: JSON.stringify(ENV),
};

/**
 * @type {import('vitest/config').UserConfig}
 */
export const baseConfig = {
    assetsInclude: ['**/*.xml', '**/*.xsl'],
    build: {
        minify: false,
        rollupOptions: {
            external,
            output: {
                // This suppresses a warning for modules with both named and
                // default exporrs when building for CommonJS (UMD in our
                // current build). It's safe to suppress this warning because we
                // have explicit tests ensuring both the default and named
                // exports are consistent with the existing public API.
                exports: 'named',
            },
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
    root: rootDir,
    server: {
        port: config.port,
    },
};
