import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import { baseConfig } from './config/build.shared';

export default defineConfig({
    ...baseConfig,

    build: {
        ...baseConfig.build,

        lib: {
            entry: resolve(__dirname, './src/transformer.ts'),
            name: 'enketo-transformer',
        },
        minify: false,
        outDir: 'dist',
        sourcemap: true,
    },
    optimizeDeps: {
        disabled: true,
    },
    ssr: {
        target: 'node',
    },
    test: {
        // Vitest uses thread-based concurrency by defualt.
        // While this would significantly improve the speed
        // of test runs, native Node extensions using N-API
        // are often not thread safe. In this case, that
        // means we cannot use concurrency for testing
        // functionality which depends on libxmljs/libxslt.
        threads: false,

        coverage: {
            provider: 'istanbul',
            include: ['src/**/*.ts'],
            reporter: ['html', 'text-summary', 'json'],
            reportsDirectory: './test-coverage',
        },

        globals: true,
        include: ['test/**/*.spec.ts'],
        reporters: 'verbose',
        sequence: { shuffle: false },
    },
});
