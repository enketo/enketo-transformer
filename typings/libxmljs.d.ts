declare module 'libxmljs' {
    export interface Node {
        replace(node: Node): unknown;
    }

    export interface NamedNode extends Node {
        name(): string;
        namespace(uri: string): this;
    }

    export interface Attr extends NamedNode {
        name(): string;
        value(): string | null;
        value(value: string): this;
    }

    interface ParentNode extends NamedNode {
        addChild(child: this): this;
        addNextSibling(sibling: this): this;
        attrs(): Attr[];
        childNodes(): Element[];

        get(
            expression: string,
            namespaces?: Record<string, string>
        ): Element | null;

        find(
            expression: string,
            namespaces?: Record<string, string>
        ): Element[];

        node(localName: string): this;
        toString(unknownOption?: boolean): string;
    }

    export class Element {
        constructor(document: Document, name: string);
    }

    export interface Element extends ParentNode {
        attr(name: string): Attr | null;
        attr(name: string, value: string): Element;
        attr(attributes: Record<string, string>): Element;
        clone(): this;
        parent(): this | null; // Maybe `Element | Document | null`?
        remove(): unknown; // Probably `boolean`?
        text(): string;
        text(value: string): this;
    }

    export interface Document extends ParentNode {
        root(): Element;
    }

    export const parseXml: (xml: string) => Document;

    export interface DocumentFragment extends ParentNode {
        root(): ParentNode;
    }

    export const parseHtmlFragment: (html: string) => DocumentFragment;
}

declare module 'node1-libxmljsmt-myh' {
    export * from 'libxmljs';
}
