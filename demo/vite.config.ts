import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { define } from '../config/build.shared';

const external = ['../src/api.ts', '../src/app.ts', '../src/node.ts'];

export default defineConfig({
    build: {
        rollupOptions: { external },
        target: 'esnext',
    },
    define,
    esbuild: { define },
    plugins: [solidPlugin()],
    server: {
        port: 3000,
    },
});
