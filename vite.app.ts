import { VitePluginNode } from 'vite-plugin-node';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import {
    config,
    baseConfig,
    define as baseDefine,
} from './config/build.shared';

const ENV = process.env.NODE_ENV ?? 'production';

const define = {
    ...baseDefine,
    ENV: JSON.stringify(ENV),
};
const appPath = resolve(__dirname, './src/app.ts');
const plugins =
    ENV === 'production'
        ? []
        : [
              VitePluginNode({
                  adapter: 'express',
                  appPath,
                  exportName: 'app',
                  tsCompiler: 'esbuild',
              }),
          ];

export default defineConfig({
    ...baseConfig,

    build: {
        ...baseConfig.build,

        lib: {
            entry: appPath,
            fileName: 'app',
            name: 'app',
        },
        outDir: 'dist',
    },

    define,
    esbuild: { define },
    plugins,
    optimizeDeps: {
        disabled: true,
    },
    server: { port: config.port },
});
