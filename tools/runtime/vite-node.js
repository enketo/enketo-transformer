// @ts-check

/**
 * This is mostly based on the example at {@link https://github.com/vitest-dev/vitest/tree/main/packages/vite-node}
 */

import { createServer } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';
import { installSourcemapsSupport } from 'vite-node/source-map';
import { resolvePath } from '../shared.js';

/**
 * @param {string} path - relative to root directory
 */
export const importTS = async (path) => {
    const server = await createServer({
        optimizeDeps: {
            disabled: false,
        },
        server: {},
    });

    const viteNodeServer = new ViteNodeServer(server);

    installSourcemapsSupport({
        getSourceMap: (source) => viteNodeServer.getSourceMap(source),
    });

    const runner = new ViteNodeRunner({
        root: server.config.root,
        base: server.config.base,
        fetchModule: viteNodeServer.fetchModule.bind(viteNodeServer),
        resolveId: viteNodeServer.resolveId.bind(viteNodeServer),
    });

    const resolvedPath = resolvePath(path);
    const { default: result } = await runner.executeFile(resolvedPath);

    await server.close();

    return result;
};
