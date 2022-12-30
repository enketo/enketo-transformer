import { DOMParser } from 'linkedom';
import type { Attr } from 'linkedom/types/interface/attr';
import type { Element as BaseElement } from 'linkedom/types/interface/element';
import type { Node } from 'linkedom/types/interface/node';
import { transform } from '../src/transformer';

import type { Survey } from '../src/transformer';

export const getXForm = async (filePath: string) => {
    const fixturePath = filePath.includes('/')
        ? filePath
        : `./test/forms/${filePath}`;
    const { default: fixture } = await import(`${fixturePath}?raw`);

    return fixture;
};

type GetTransformedFormOptions = Omit<Survey, 'xform'>;

export const getTransformedForm = async (
    filePath: string,
    options?: GetTransformedFormOptions
) => {
    const xform = await getXForm(filePath);

    return transform({
        ...options,
        xform,
    });
};

export const parser = new DOMParser();

export const getTransformedFormDocument = async (
    filePath: string,
    options?: GetTransformedFormOptions
) => {
    const { form } = await getTransformedForm(filePath, options);

    return parser.parseFromString(form, 'text/html');
};

export const getTransformedModelDocument = async (
    filePath: string,
    options?: GetTransformedFormOptions
) => {
    const { model } = await getTransformedForm(filePath, options);

    return parser.parseFromString(model, 'text/xml');
};

export const XMLDocument = parser.parseFromString(
    '<a/>',
    'text/xml'
).constructor;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type XMLDocument = import('linkedom/types/xml/document').XMLDocument;

export const HTMLDocument = parser.parseFromString(
    '<p></p>',
    'text/html'
).constructor;

export type DOMMimeType = 'text/xml' | 'text/html';

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type HTMLDocument = import('linkedom/types/html/document').HTMLDocument;

export type Document = XMLDocument | HTMLDocument;

declare module 'linkedom/types/interface/attr' {
    interface Attr {
        namespaceURI: string;
    }
}

declare module 'linkedom/types/interface/node' {
    interface Node {
        cloneNode<T extends Omit<Node, '_getParent'>>(
            this: T,
            deep?: boolean
        ): T;
    }
}

interface TypedNodeList<T extends Node = Node> extends Iterable<T> {
    item(i: number): T | void;
}

export interface Element extends Omit<BaseElement, 'attributes'> {
    get attributes(): TypedNodeList<Attr>;
}

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
