import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

const external = [
    '../src/api.ts',
    '../src/app.ts',
    '../src/dom/node/index.ts',
    'path',
];

export default defineConfig({
    appType: 'spa',
    build: {
        rollupOptions: {
            external,
            input: ['./demo.tsx'],
            treeshake: true,
        },
        target: 'esnext',
    },
    optimizeDeps: {
        disabled: true,
    },
    plugins: [solidPlugin()],
    server: {
        port: 3000,
    },
});
