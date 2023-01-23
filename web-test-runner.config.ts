import { defaultReporter, summaryReporter } from '@web/test-runner';
import type { TestRunnerConfig } from '@web/test-runner';
import { playwrightLauncher } from '@web/test-runner-playwright';
import vitePluginIstanbul from 'vite-plugin-istanbul';
import type { InlineConfig } from 'vite';
import { baseConfig } from './config/build.shared';
import { vitePlugin } from './tools/plugins/web-test-runner/vite';

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
        reporters: ['html', 'json'],
    },
    nodeResolve: true,
    plugins: [
        vitePlugin({
            ...baseConfig,

            clearScreen: false,
            configFile: './vite.web.ts',

            build: {
                ...baseConfig.build,

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
                ...((baseConfig as InlineConfig).plugins ?? []),

                vitePluginIstanbul({
                    include: ['src/*', '!src/node.ts'],
                    exclude: ['node_modules', 'test/*'],
                    extension: ['.ts'],
                }),
            ],
        } satisfies InlineConfig),
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
} satisfies TestRunnerConfig;
