declare module 'libxmljs' {
    export interface Node {
        replace(node: Node): unknown;
    }

    export interface Attr extends Node {
        name(): string;
        value(): string | null;
    }

    interface ParentNode extends Node {
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

        node(localName: string): Element;
    }

    interface NamespacedNode extends ParentNode {
        namespace(uri: string): this;
    }

    export interface Element extends NamespacedNode {
        attr(name: string): Attr | null;
        attr(name: string, value: string): this;
        attr(attributes: Record<string, string>): this;
    }

    export interface Document extends NamespacedNode {}
}
