import tags from 'language-tags';
import stringDirection from 'string-direction';

import type { Tag, Subtag } from 'language-tags';

class Language {
    /**
     * Included for backwards compatibility, prefer:
     *
     * @alias description
     */
    get desc() {
        return this.description;
    }

    /**
     * Included for backwards compatibility, prefer:
     *
     * @alias directionality
     */
    get dir() {
        return this.directionality;
    }

    /**
     * Included for backwards compatibility, prefer:
     *
     * @alias sourceLanguage
     */
    get src() {
        return this.sourceLanguage;
    }

    constructor(
        readonly sourceLanguage: string,
        readonly description: string,
        readonly tag: string,
        readonly directionality: string
    ) {}
}

export type {
    Language,
    /**
     * Exported for backwards compatibility, prefer:
     *
     * @alias Language
     */
    Language as LanguageObj,
};

/**
 * Parses a language string into a {@link Language}. Guesses missing properties.
 * TODO: this should be refactored (more than it has been since this comment was
 * initially written).
 *
 * @see
 * {http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry}
 */
export const parseLanguage = (
    sourceLanguage: string,
    sample: string
): Language => {
    const directionality = getDirectionality(sample);

    let description = sourceLanguage.trim();
    let tag = description;

    const parts = sourceLanguage.match(/^([^(]+)\((.*)\)\s*$/);

    if (parts && parts.length > 2) {
        description = parts[1].trim();
        tag = parts[2].trim();
    } else {
        // First check whether `sourceLanguage` is a known IANA subtag like 'en' or 'en-GB'
        const languageFromTag = getLanguageFromSubtag(
            sourceLanguage.split('-')[0]
        );

        if (languageFromTag == null) {
            const { subtag } =
                getLanguageFromDescription(description)?.data ?? {};

            if (subtag != null) {
                tag = subtag;
            }
        } else {
            description = languageFromTag.descriptions()[0];
        }
    }

    return new Language(sourceLanguage, description, tag, directionality);
};

/**
 * Performs IANA search to find language object with provided description.
 */
const getLanguageFromDescription = (description: string) =>
    tags.search(description).find(isLanguage);

/**
 * Performs IANA search to find language object with provided subtag.
 */
const getLanguageFromSubtag = (subtag: string) =>
    tags.subtags(subtag).find(isLanguage) ?? null;

const isLanguage = (object: Tag | Subtag) => object.data.type === 'language';

enum Directionality {
    /**
     * @default (?)
     * @see {@link getDirectionality}
     */
    LTR = 'ltr',
    RTL = 'rtl',
}

/**
 * Obtains the directionality of a text sample.
 *
 * TODO: According to the prior JSDoc, the default is supposed to be
 * {@link Directionality.LTR}, but the logic suggests the opposite.
 */
const getDirectionality = (sample: string) => {
    const direction = stringDirection.getDirection(sample);

    if (direction !== Directionality.LTR) {
        return Directionality.RTL;
    }

    return direction;
};

/**
 * Exported for backwards compatibility, prefer named imports.
 */
export default {
    parse: parseLanguage,
};
