import { DOMParser } from '@xmldom/xmldom';
import fs from 'fs/promises';
import { transform } from '../src/transformer';

import type { Survey } from '../src/transformer';

export const getXForm = async (fileName: string) => {
    const fileContents = await fs.readFile(`./test/forms/${fileName}`);

    return String(fileContents);
};

type GetTransformedFormOptions = Omit<Survey, 'xform'>;

export const getTransformedForm = async (
    fileName: string,
    options?: GetTransformedFormOptions
) => {
    const xform = await getXForm(fileName);

    return transform({
        ...options,
        xform,
    });
};

const attributeMissedValuePattern =
    /^\[xmldom warning\]\s+attribute "[^"]+" missed value!!/;

class SuppressAttributeShorthandWarningDOMParser extends DOMParser {
    private isParsingHTML = false;

    constructor() {
        super({
            errorHandler: {
                warning: (msg: string) => {
                    if (
                        this.isParsingHTML &&
                        attributeMissedValuePattern.test(msg)
                    ) {
                        return;
                    }

                    console.warn(msg);
                },
            },
        });
    }

    parseFromString(xmlsource: string, mimeType?: string) {
        if (mimeType === 'text/html') {
            this.isParsingHTML = true;
        }

        try {
            return super.parseFromString(xmlsource, mimeType);
        } finally {
            this.isParsingHTML = false;
        }
    }
}

export const parser = new SuppressAttributeShorthandWarningDOMParser();

export const getTransformedFormDocument = async (
    fileName: string,
    options?: GetTransformedFormOptions
) => {
    const { form } = await getTransformedForm(fileName, options);

    return parser.parseFromString(form, 'text/html');
};

export const getTransformedModelDocument = async (
    fileName: string,
    options?: GetTransformedFormOptions
) => {
    const { model } = await getTransformedForm(fileName, options);

    return parser.parseFromString(model, 'text/xml');
};

/**
 * TODO: `@xmldom/xmldom` does not export `Document`. It's pretty linkely that {@link https://github.com/WebReflection/linkedom linkedom}:
 *
 * 1. Does export it.
 * 2. Is a drop-in replacement for `@xmldom/xmldom`.
 * 3. Could very possibly go away soon anyway ;)
 */
const document = parser.parseFromString('<a>', 'text/html');

export const DocumentConstructor = document.constructor;

export type Document = typeof document;
