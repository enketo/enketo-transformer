import xslForm from './xsl/openrosa2html5form.xsl?raw';
import xslModel from './xsl/openrosa2xmlmodel.xsl?raw';

export const NAMESPACES = {
    xmlns: 'http://www.w3.org/2002/xforms',
    orx: 'http://openrosa.org/xforms',
    h: 'http://www.w3.org/1999/xhtml',
} as const;

export const sheets = {
    xslForm,
    xslModel,
};

export { escapeURLPath } from './url';

export const version = HASHED_VERSION;

interface BaseTransformedSurvey {
    form: string;
    languageMap: Record<string, string>;
    model: string;
    transformerVersion: string;
}

export type TransformedSurvey<T = any> = Omit<T, keyof BaseTransformedSurvey> &
    BaseTransformedSurvey;
