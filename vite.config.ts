import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import { baseConfig, define as baseDefine } from './config/build.shared';

const ENV = process.env.NODE_ENV ?? 'development';

const define = {
    ...baseDefine,
    ENV: JSON.stringify(ENV),
};

export default defineConfig({
    ...baseConfig,

    assetsInclude: ['config/config.json', '**/*.xsl'],
    build: {
        ...baseConfig.build,

        lib: {
            entry: resolve(__dirname, './src/node.ts'),
            fileName: 'node',
            formats: ['cjs'],
            name: 'node',
        },
        minify: false,
        outDir: 'dist',
        sourcemap: true,
    },
    define,
    esbuild: {
        ...baseConfig.esbuild,

        define,
    },
    optimizeDeps: {
        disabled: true,
    },
    test: {
        // Vitest uses thread-based concurrency by defualt.
        // While this would significantly improve the speed
        // of test runs, native Node extensions using N-API
        // are often not thread safe. In this case, that
        // means we cannot use concurrency for testing
        // functionality which depends on libxmljs/libxslt.
        threads: false,

        // Coverage is now checked in `@web/test-runner`
        // with the tests which originally existed before
        // the web transition.
        // coverage: {},

        globals: true,
        include: ['./test/node/**/*.spec.ts'],
        reporters: 'verbose',
        sequence: { shuffle: true },
        resolveSnapshotPath: (testPath, snapExtension) =>
            `${testPath.replace('/node/', '/__snapshots__/')}${snapExtension}`,
    },
});
