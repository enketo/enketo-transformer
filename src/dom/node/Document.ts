import type { ParentNode } from 'libxmljs';
import { libxmljs } from 'libxslt';
import { NAMESPACES } from '../../shared';
import type { DOM } from '../abstract';
import { NodeTypes } from '../shared';

const { Document, Element } = libxmljs;

/** @package */
export const XPathResult = {
    ORDERED_NODE_SNAPSHOT_TYPE: 6 as const,
    snapshotItem: () => null,
    snapshotLength: 0,
} satisfies DOM.XPathResult;

/** @package */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DOMExtendedDocument extends DOM.Node {}

export class DOMExtendedDocument implements DOM.Document {
    get documentElement() {
        return (this as any as DOMExtendedDocument & Document).root();
    }

    readonly nodeName = '#document';

    readonly nodeType = NodeTypes.DOCUMENT_NODE;

    createElement(this: DOMExtendedDocument & Document, name: string): Element {
        return new Element(this, name);
    }

    createElementNS(
        this: DOMExtendedDocument & Document,
        namespaceURI: string | null,
        name: string
    ): Element {
        const [prefix, suffix] = name.split(':');

        const element = new Element(this, suffix ?? name);

        if (suffix == null || namespaceURI == null) {
            return element;
        }

        const namespace = element.defineNamespace(prefix, namespaceURI);

        element.namespace(namespace);

        return element;
    }

    evaluate(
        this: Document & DOMExtendedDocument,
        xpathExpression: string,
        contextNode: ParentNode,
        namespaceResolver: DOM.NamespaceResolver | null,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - this is part of the interface!
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resultType: XPathResult['ORDERED_NODE_SNAPSHOT_TYPE']
    ) {
        const namespaces =
            namespaceResolver == null
                ? undefined
                : Object.fromEntries(
                      Object.entries(NAMESPACES).filter(
                          ([prefix, value]) =>
                              namespaceResolver.lookupNamespaceURI(prefix) ===
                              value
                      )
                  );

        const results = (contextNode ?? this).find(xpathExpression, namespaces);

        return {
            snapshotItem: (index: number) => results[index],
            snapshotLength: results.length,
        };
    }
}

/* eslint-disable @typescript-eslint/no-redeclare */
type Document = InstanceType<typeof Document>;
type Element = InstanceType<typeof Element>;
export type XPathResult = typeof XPathResult;
/* eslint-enable @typescript-eslint/no-redeclare */

const { constructor: _, ...descriptors } = Object.getOwnPropertyDescriptors(
    DOMExtendedDocument.prototype
);

Object.defineProperties(Document.prototype, descriptors);
