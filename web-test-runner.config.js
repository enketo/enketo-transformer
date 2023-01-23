import { importTS } from './tools/runtime/vite-node.js';

const config = await importTS('./web-test-runner.config.ts');

export default config;
