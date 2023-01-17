import { defineConfig } from 'vitest/config';
import type { UserConfig } from 'vitest/config';
import { resolve } from 'path';
import {
    baseConfig,
    define as baseDefine,
    SERVER_PORT,
} from './config/build.shared';

const ENV = process.env.NODE_ENV ?? 'web';

const define = {
    ...baseDefine,
    ENV: JSON.stringify(ENV),
};

const external = ['./src/api.ts', './src/app.ts', './src/node.ts'];

const lib =
    ENV === 'lib'
        ? {
              entry: resolve(__dirname, './src/transformer.ts'),
              name: 'transformer',
              fileName: 'transformer',
          }
        : undefined;

export const config: UserConfig = {
    ...baseConfig,

    build: {
        ...baseConfig.build,

        lib,
        sourcemap: true,
    },

    define,

    esbuild: {
        define,
        sourcemap: true,
    },
    experimental: {
        // Ensure relative paths can be loaded from index.html
        renderBuiltUrl(filename) {
            return filename.replace(/^\//, '');
        },
    },
    optimizeDeps: {
        entries: ['./src/web.ts'],
        exclude: external,
    },
    server: { port: SERVER_PORT },
    test: {
        globals: true,
    },
};

export default defineConfig(config);
