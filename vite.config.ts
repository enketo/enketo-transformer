import { defineConfig } from 'vitest/config';

export default defineConfig({
    assetsInclude: ['**/*.xml', '**/*.xsl'],
    build: {
        outDir: 'build',
        minify: 'esbuild',
        sourcemap: true,
    },
    esbuild: {
        sourcemap: 'inline',
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
        sequence: { shuffle: true },
    },
});
