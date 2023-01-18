// @ts-check - unfortunately a TypeScript config file is not supported

import { defaultReporter, summaryReporter } from '@web/test-runner';
import { playwrightLauncher } from '@web/test-runner-playwright';
import vitePluginIstanbul from 'vite-plugin-istanbul';
import { baseConfig } from './config/build.shared.js';
import { vitePlugin } from './tools/plugins/web-test-runner/vite.js';

/** @type {import('@web/test-runner').TestRunnerConfig} */
export default {
    files: ['./test/**/*.spec.ts', '!./test/node/**/*'],
    browsers: [
        playwrightLauncher({
            product: 'firefox',
        }),
        playwrightLauncher({
            product: 'chromium',
        }),
    ],
    coverage: true,
    coverageConfig: {
        exclude: ['./src/node.ts'],
        include: ['./src/**/*.ts'],
        report: true,
        reportDir: './test-coverage',
    },
    nodeResolve: true,
    plugins: [
        vitePlugin({
            ...baseConfig,

            clearScreen: false,
            configFile: './vite.web.ts',

            build: {
                ...baseConfig.build,

                rollupOptions: {
                    ...baseConfig.build?.rollupOptions,

                    external: [
                        .../** @type {string[]} */ (
                            baseConfig.build?.rollupOptions?.external ?? []
                        ),

                        './src/node.ts',
                    ],
                },

                sourcemap: true,
            },

            // Note: for some reason `define` is not picked up when
            // specifying `configFile`.
            define: {
                ...baseConfig.define,
                ENV: 'test',
            },

            // It's plugins all the way down...
            plugins: [
                ...(baseConfig.plugins ?? []),

                vitePluginIstanbul({
                    include: ['src/*', '!src/node.ts'],
                    exclude: ['node_modules', 'test/*'],
                    extension: ['.ts'],
                }),
            ],
        }),
    ],
    reporters: [
        summaryReporter({}),
        defaultReporter({
            reportTestProgress: true,
            reportTestResults: true,
        }),
    ],
    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '2000',
        },
    },
};
