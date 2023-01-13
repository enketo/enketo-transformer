// @ts-check

import { createServer } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import {
    config,
    external,
    resolvePath,
    rootDir,
} from './config/build.shared.js';

const appPath = resolvePath('./app.ts');

const init = async () => {
    /** @type {import('vite').UserConfig} */
    const baseOptions = {
        mode: 'development',
        build: {
            rollupOptions: {
                external,
            },
        },
        optimizeDeps: {
            disabled: true,
        },
        root: rootDir,
        ssr: {
            target: 'node',
        },
    };

    const servers = await Promise.all([
        createServer({
            ...baseOptions,
            configFile: false,
            plugins: VitePluginNode({
                adapter: 'express',
                appPath,
                exportName: 'app',
                tsCompiler: 'esbuild',
            }),
            server: {
                port: config.port,
            },
        }),
        createServer({
            ...baseOptions,
            configFile: false,
            publicDir: resolvePath('./test/forms'),
            server: {
                port: 8081,
            },
        }),
    ]);

    await Promise.all(servers.map((server) => server.listen()));

    servers.forEach((server) => {
        server.printUrls();
    });
};

init();
