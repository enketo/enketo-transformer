/**
 * Note: we **intentionally** neither import nor export anything from
 * `/src/dom/web/*`. This is because merely referencing them will cause the
 * entire project to incorrectly have global `dom` and `dom.iterble` lib types.
 * Instead, we have a separate TypeScript config which aliases the web types to
 * ensure they're compatible.
 */

export type { DOM } from './abstract';
export * from './node';
