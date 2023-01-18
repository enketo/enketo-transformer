import { transform } from '../src/transformer';

import type { Survey } from '../src/transformer';

export interface Fixture {
    fileName: string;
    origin: string;
    formPath: string;
    xform: string;
}

export const fixtures = await Promise.all(
    Object.entries(
        import.meta.glob('./**/*.xml', {
            as: 'raw',
            eager: false,
        })
    ).map(async ([formPath, importXForm]): Promise<Fixture> => {
        const xform = await importXForm();
        const origin =
            formPath.match(/\/external-fixtures\/([^/]+)/)?.[1] ??
            'enketo-transformer';
        const fileName = formPath.replace(/.*\/([^/]+)$/, '$1');

        return {
            fileName,
            origin,
            formPath,
            xform,
        };
    })
);

export const fixturesByOrigin = fixtures
    .reduce<Map<string, Fixture[]>>((acc, fixture) => {
        const { origin } = fixture;
        let group = acc.get(origin);

        if (group == null) {
            group = [];
            acc.set(origin, group);
        }

        group.push(fixture);

        return acc;
    }, new Map<string, Fixture[]>())
    .entries();

const fixturesByFileName = new Map(
    fixtures.map((fixture) => {
        const { fileName } = fixture;

        return [fileName, fixture] as const;
    })
);

const fixturesByPath = new Map(
    fixtures.map((fixture) => {
        const { formPath: path } = fixture;

        return [path, fixture] as const;
    })
);

export const getXForm = async (fixture: string) =>
    (fixturesByFileName.get(fixture) ?? fixturesByPath.get(fixture)!).xform;

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

export const getTransformedFormDocument = async (
    fileName: string,
    options?: GetTransformedFormOptions
) => {
    const { form } = await getTransformedForm(fileName, options);
    const parser = new DOMParser();

    return parser.parseFromString(form, 'text/html');
};

export const getTransformedModelDocument = async (
    fileName: string,
    options?: GetTransformedFormOptions
) => {
    const { model } = await getTransformedForm(fileName, options);
    const parser = new DOMParser();

    return parser.parseFromString(model, 'text/xml');
};

export * from '../src/dom';
