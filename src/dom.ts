/**
 * Most of this module **is temporary!** I will explain my rationale in the PR.
 *
 * As far as this particular module goes, the intent is to best respresent the
 * actual/known types of **linkedom**'s DOM implementation as used, rather than using
 * TypeScript's own DOM ("lib") typings which have many subtle differences.
 */

// This augments the global namespace, which is bad... but it shouldn't last long ;)
import 'css.escape';
import { DOMParser } from 'linkedom';
import type { DOMTokenList } from 'linkedom/types/dom/token-list';
import type { HTMLDocument as BaseHTMLDocument } from 'linkedom/types/html/document';
import type { HTMLElement as BaseHTMLElement } from 'linkedom/types/html/element';
import type { Attr } from 'linkedom/types/interface/attr';
import type { Comment } from 'linkedom/types/interface/comment';
import type { Element as BaseElement } from 'linkedom/types/interface/element';
import type { Node as BaseNode } from 'linkedom/types/interface/node';
import type { Text } from 'linkedom/types/interface/text';
import type { XMLDocument as BaseXMLDocument } from 'linkedom/types/xml/document';

export type Node = Omit<BaseNode, '_getParent'>;

interface TypedNodeList<T extends Node = Node> extends Iterable<T> {
    item(i: number): T | void;
}

export interface HTMLElement extends Omit<BaseHTMLElement, 'attributes'> {
    attributes: TypedNodeList<Attr>;
    classList: DOMTokenList;
}

declare module 'linkedom/types/interface/attr' {
    interface Attr {
        namespaceURI: string;
    }
}

export interface Element extends Omit<BaseElement, 'attributes'> {
    get attributes(): TypedNodeList<Attr>;
}

declare module 'linkedom/types/interface/node' {
    interface Node {
        cloneNode<T extends Omit<Node, '_getParent'>>(
            this: T,
            deep?: boolean
        ): T;
    }
}

declare module 'linkedom/types/mixin/parent-node' {
    interface ParentNode {
        querySelector(this: HTMLDocument, query: string): HTMLElement | null;
        querySelector(this: HTMLElement, query: string): HTMLElement | null;
        querySelector<T extends Element = Element>(query: string): T | null;
        querySelectorAll(this: HTMLDocument, query: string): HTMLElement[];
        querySelectorAll(this: HTMLElement, query: string): HTMLElement[];
        querySelectorAll<T extends Element = Element>(query: string): T[];
    }
}

export type Document = Omit<
    BaseHTMLDocument | BaseXMLDocument,
    'documentElement'
> &
    Node & {
        get documentElement(): Element;
    };

export const parser = new DOMParser();

const xmlDocument = parser.parseFromString('<a/>', 'text/xml');

export const XMLDocument = xmlDocument.constructor;

/* **sigh** I don't know what the best long-term course of action for this is.
This is the idiomatic way to express the instance type of a constructor value.
*/
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type XMLDocument = typeof xmlDocument;

const htmlDocument = parser.parseFromString('<a></a>', 'text/html');

const htmlElement = htmlDocument.documentElement;

export const HTMLElementConstructor = htmlElement.constructor;

export const HTMLDocument = htmlDocument.constructor;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type HTMLDocument = typeof htmlDocument;

export type DOMMimeType = 'text/html' | 'text/xml';

export type DocumentFromMimeType<T extends DOMMimeType> = T extends 'text/html'
    ? HTMLDocument
    : XMLDocument;

/* The `linkedom` library does not provide an `XMLSerializer`. This is roughly
 * its API equivalent. */
export const serializer = {
    serializeToString(node?: Node | null) {
        if (node == null) {
            throw new Error('Serialization failed.');
        }

        return node.toString();
    },
};

/**
 * This is named `NodeType` but represents the enumerated members of the
 * standard DOM `Node` whose values might be assigned to a `Node`'s `nodeType`.
 * @enum
 * @see {xmlDocument}
 */
export const NodeType = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
};

/** @see {NodeType} */
export const NodeFilterType = {
    SHOW_ALL: 4294967295,
    SHOW_ATTRIBUTE: 2,
    SHOW_COMMENT: 128,
    SHOW_DOCUMENT: 256,
    SHOW_DOCUMENT_FRAGMENT: 1024,
    SHOW_DOCUMENT_TYPE: 512,
    SHOW_ELEMENT: 1,
    SHOW_PROCESSING_INSTRUCTION: 64,
    SHOW_TEXT: 4,
};

const css = CSS;

export { css as CSS };

export type { Attr, Comment, Text };
