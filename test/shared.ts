import { parser } from '../src/dom';
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

export * from '../src/dom';
