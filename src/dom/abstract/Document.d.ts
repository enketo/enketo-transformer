import type { Element } from './Element';
import type { Node } from './Node';

/** @package */
export interface NamespaceResolver {
    lookupNamespaceURI(prefix: string): string | null;
}

/** @package */
export interface XPathResult {
    ORDERED_NODE_SNAPSHOT_TYPE?: number;
    snapshotItem?(index: number): Node | null;
    snapshotLength?: number;
}

/** @package */
export interface Document {
    readonly documentElement: Element;
    readonly nodeName: string;
    readonly nodeType: number;
    readonly ownerDocument: Document | null;
    readonly parentElement: Element | null;
    readonly textContent: string | null;

    cloneNode(deep?: boolean): Node;
    createElement(name: string): Element;
    createElementNS(namespaceURI: string | null, name: string): Element;
    evaluate(
        xpathExpression: string,
        contextNode: Node | Document,
        namespaceResolver: NamespaceResolver | null,
        resultType: number
    ): XPathResult;
}
