import tags from 'language-tags';
import stringDirection from 'string-direction';

import type { Tag, Subtag } from 'language-tags';

class LanguageObj {
    constructor(
        readonly src: string,
        readonly desc: string,
        readonly tag: string,
        readonly dir: string
    ) {}
}

export type { LanguageObj };

/**
 * Parses a language string into a language object. Guesses missing properties.
 * TODO: this should be refactored (more than it has been since this comment was
 * initially written).
 *
 * @see
 * {http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry}
 */
export const parseLanguage = (lang: string, sample: string): LanguageObj => {
    const dir = getDirectionality(sample);
    const src = lang;

    let desc = lang.trim();
    let tag = desc;

    const parts = lang.match(/^([^(]+)\((.*)\)\s*$/);

    if (parts && parts.length > 2) {
        desc = parts[1].trim();
        tag = parts[2].trim();
    } else {
        // First check whether lang is a known IANA subtag like 'en' or 'en-GB'
        const langWithTag = getLangWithTag(lang.split('-')[0]);

        if (langWithTag == null) {
            const { subtag } = getLangWithDesc(desc)?.data ?? {};

            if (subtag != null) {
                tag = subtag;
            }
        } else {
            desc = langWithTag.descriptions()[0];
        }
    }

    return new LanguageObj(src, desc, tag, dir);
};

/**
 * Performs IANA search to find language object with provided description.
 *
 * @param desc - Language description.
 * @return the first language object result that was found.
 */
const getLangWithDesc = (desc?: string) => {
    const results: Array<Tag | Subtag> = desc
        ? tags.search(desc).filter(languagesOnly)
        : [];

    return results[0] || '';
};

/**
 * Performs IANA search to find language object with provided subtag.
 */
const getLangWithTag = (tag: string) =>
    tag ? tags.subtags(tag).find(languagesOnly) ?? null : null;

/**
 * Filters objects with type "language" from a list of objects.
 *
 * @param  obj - Language object returned by 'language-tags' library.
 * @return whether filter evaluated to true.
 */
const languagesOnly = (obj: Tag | Subtag) => obj.data.type === 'language';

/**
 * Obtains the directionality of a text sample.
 *
 * @param sample - A text sample.
 * @return either 'rtl' or the default 'ltr'.
 */
const getDirectionality = (sample: string) => {
    const direction = stringDirection.getDirection(sample);

    if (direction !== 'ltr') {
        return 'rtl';
    }

    return direction;
};

/**
 * Exported for backwards compatibility, prefer named imports.
 */
export default {
    parse: parseLanguage,
};
