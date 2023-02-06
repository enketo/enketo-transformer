import { DOMParser } from 'linkedom';
import type { Attr } from 'linkedom/types/interface/attr';
import type { Element as BaseElement } from 'linkedom/types/interface/element';
import type { Node } from 'linkedom/types/interface/node';
import { basename } from 'path';
import { transform } from '../src/transformer';

import type { Survey } from '../src/transformer';

interface Fixture {
    fileName: string;
    origin: string;
    fixturePath: string;
    xform: string;
}

export const fixtures = (
    await Promise.all(
        Object.entries(
            import.meta.glob('./**/*.xml', {
                as: 'raw',
                eager: false,
            })
        ).map(async ([fixturePath, importXForm]): Promise<Fixture> => {
            const xform = await importXForm();
            const origin =
                fixturePath.match(/\/external-fixtures\/([^/]+)/)?.[1] ??
                'enketo-transformer';
            const fileName = basename(fixturePath);

            return {
                fileName,
                origin,
                fixturePath,
                xform,
            };
        })
    )
).sort((A, B) => {
    const a = A.fileName.toLowerCase().replace(/.*\/([^/]+)$/, '$1');
    const b = B.fileName.toLowerCase().replace(/.*\/([^/]+)$/, '$1');

    if (a > b) {
        return 1;
    }

    return b > a ? -1 : 0;
});

const xformsByPath = Object.fromEntries(
    fixtures.flatMap(({ fileName, fixturePath, xform }) => [
        [fileName, xform],
        [fixturePath, xform],
    ])
);

export const getXForm = async (fixturePath: string) =>
    xformsByPath[fixturePath];

type GetTransformedFormOptions = Omit<Survey, 'xform'>;

export const getTransformedForm = async (
    fixturePath: string,
    options?: GetTransformedFormOptions
) => {
    const xform = await getXForm(fixturePath);

    return transform({
        ...options,
        xform,
    });
};

export const parser = new DOMParser();

export const getTransformedFormDocument = async (
    fixturePath: string,
    options?: GetTransformedFormOptions
) => {
    const { form } = await getTransformedForm(fixturePath, options);

    return parser.parseFromString(form, 'text/html');
};

export const getTransformedModelDocument = async (
    fixturePath: string,
    options?: GetTransformedFormOptions
) => {
    const { model } = await getTransformedForm(fixturePath, options);

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
