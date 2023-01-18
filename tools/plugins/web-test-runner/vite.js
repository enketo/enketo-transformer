// @ts-check - unfortunately a TypeScript plugin file is not supported
/* eslint-disable consistent-return */

import { isTestFilePath } from '@web/test-runner';
import { createServer } from 'vite';

/**
 * This is a modified version of the as-yet unmerged changes in
 * {@link https://github.com/material-svelte/vite-web-test-runner-plugin/pull/18}.
 * It's been extended to specify the Vite config.
 *
 * @param {import('vite').InlineConfig} [config]
 */
export const vitePlugin = (config) => {
    /** @type {import('vite').ViteDevServer} */
    let server;

    /**
     * @param {string} url
     */
    const isTestRunnerFile = (url) =>
        url.startsWith('/__web-dev-server') ||
        url.startsWith('/__web-test-runner');

    /** @type {import('@web/test-runner').TestRunnerPlugin} */
    const plugin = {
        name: 'vite-plugin',
        async serverStart() {
            server = await createServer(config);

            await server.listen();
        },
        async serverStop() {
            await server.close();
        },
        async serve({ request }) {
            if (isTestRunnerFile(request.url)) return;

            try {
                const transformed = await server.transformRequest(request.path);

                if (transformed != null) {
                    return { body: transformed?.code };
                }
            } catch {
                // Don't crash in watch mode for invalid code, wait for it to be
                // fixed instead
            }
        },
        async transformImport({ source }) {
            if (!isTestFilePath(source) || isTestRunnerFile(source)) {
                return;
            }

            const { port, https, host } = server.config.server;
            return `${https ? 'https' : 'http'}://${host ?? 'localhost'}:${
                port ?? 80
            }${source}`;
        },
    };

    return plugin;
};
