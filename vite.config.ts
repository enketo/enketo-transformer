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
        globals: true,
        include: [
            // 'test/**/*.spec.js',
            'test/**/*.spec.ts',
        ],
    },
});
