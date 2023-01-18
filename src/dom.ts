// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../typings/lib/dom.d.ts" />

export type DOMMimeType = 'text/html' | 'text/xml';

export type DocumentFromMimeType<T extends DOMMimeType> = T extends 'text/html'
    ? Document
    : XMLDocument;

export const parseHTML = (html: string) => {
    const parser = new DOMParser();

    return parser.parseFromString(html, 'text/html');
};

export const parseXML = (xml: string) => {
    const parser = new DOMParser();

    return parser.parseFromString(xml, 'text/xml');
};

export const serializeHTML = (doc: Document) => {
    const { documentElement } = doc;
    const { innerHTML } = document.importNode(documentElement, true) as Element;

    return innerHTML;
};

export const serializeXML = (doc: XMLDocument) => {
    const { documentElement } = doc;
    const serializer = new XMLSerializer();

    return serializer
        .serializeToString(documentElement)
        .trim()
        .replace(/^<root.*?>\s*/, '')
        .replace(/\s*<\/root>$/, '');
};
