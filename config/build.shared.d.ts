import type { UserConfig } from 'vitest/config';

export const baseConfig: UserConfig;
export const config: typeof import('./config.json');
export const define: Record<string, string>;
export const external: string[];
export const resolvePath: (path: string) => string;
export const readFile: (path: string) => string;
export const rootDir: string;
