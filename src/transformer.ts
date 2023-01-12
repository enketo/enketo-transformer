import crypto from 'crypto';
import libxslt from 'libxslt';
import type { Document as XMLJSDocument } from 'libxmljs';
import xpathToCSS from 'xpath-to-css';
import pkg from '../package.json';
import xslForm from './xsl/openrosa2html5form.xsl?raw';
import xslModel from './xsl/openrosa2xmlmodel.xsl?raw';
import { CSS, NodeFilterType, parser, serializer } from './dom';
import type {
    Attr,
    Comment,
    Document,
    DocumentFromMimeType,
    DOMMimeType,
    Element,
    HTMLElement,
} from './dom';
import language from './language';
import { markdownToHTML } from './markdown';
import { escapeURLPath, getMediaPath } from './url';

const { libxmljs } = libxslt;

export const NAMESPACES = {
    xmlns: 'http://www.w3.org/2002/xforms',
    orx: 'http://openrosa.org/xforms',
    h: 'http://www.w3.org/1999/xhtml',
} as const;

type LibXMLJS = typeof libxmljs;

/**
 * This function **is temporary!** It works around a few bugs in the `linkedom`
 * library's sanitization and serialization behavior. We can file those bugs,
 * but we won't need to live with them for long.
 */
const fixAttributes = (domDocument: Document) => {
    const fixAttributesTreeWalker = domDocument.createTreeWalker(
        domDocument.documentElement,
        NodeFilterType.SHOW_ELEMENT
    );

    while (fixAttributesTreeWalker.nextNode() != null) {
        const attributes = Array.from<Attr>(
            (fixAttributesTreeWalker.currentNode as HTMLElement).attributes
        );

        attributes.forEach((attr) => {
            const { value } = attr;

            attr.value = value
                .replace(/&(\w+)\b(?!;)/g, '&amp;$1')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        });
    }
};

const xmljsToDOM = <T extends DOMMimeType>(
    document: XMLJSDocument,
    mimeType: T
): DocumentFromMimeType<T> => {
    const domDocument = parser.parseFromString<T>(
        document.toString(false),
        mimeType
    );

    fixAttributes(domDocument);

    return domDocument as DocumentFromMimeType<T>;
};

const domToXMLJS = async (document: Document): Promise<XMLJSDocument> => {
    fixAttributes(document);

    return parseXMLJS(document.toString());
};

export type TransformPreprocess = (
    this: LibXMLJS,
    doc: XMLJSDocument
) => XMLJSDocument;

export interface TransformOptions {
    markdown?: boolean;
    media?: Record<string, string>;
    openclinica?: boolean | number;
    preprocess?: TransformPreprocess;
    theme?: string;
}

interface BaseSurvey {
    xform: string;
}

export type Survey = BaseSurvey & TransformOptions;

export interface TransformedSurvey {
    form: string;
    languageMap: Record<string, string>;
    model: string;
    transformerVersion: string;
}

/**
 * Performs XSLT transformation on XForm and process the result.
 */
export const transform = async (survey: Survey): Promise<TransformedSurvey> => {
    const { xform, markdown, media, openclinica, preprocess, theme } = survey;

    const xsltParams = openclinica
        ? {
              openclinica: 1,
          }
        : {};

    const mediaMap = Object.fromEntries(
        Object.entries(media || {}).map((entry) => entry.map(escapeURLPath))
    );

    const doc = await parseXMLJS(xform);
    const preprocessed =
        typeof preprocess === 'function' ? preprocess.call(libxmljs, doc) : doc;
    const xformDoc = xmljsToDOM(preprocessed, 'text/xml');

    processBinaryDefaults(xformDoc, mediaMap);

    const htmlDoc = xmljsToDOM(
        await xslTransform(xslForm, xformDoc, xsltParams),
        'text/html'
    );

    correctAction(htmlDoc, 'setgeopoint');
    correctAction(htmlDoc, 'setvalue');

    if (typeof theme === 'string' && theme.trim() !== '') {
        replaceTheme(htmlDoc, theme);
    }

    replaceMediaSources(htmlDoc, mediaMap);

    const languageMap = replaceLanguageTags(htmlDoc);

    if (markdown !== false) {
        renderMarkdown(htmlDoc, mediaMap);
    }

    fixAttributes(htmlDoc);

    const form = serializer.serializeToString(
        htmlDoc.querySelector(':root > *')
    );
    const xmlDoc = xmljsToDOM(
        await xslTransform(xslModel, xformDoc),
        'text/xml'
    );

    replaceMediaSources(xmlDoc, mediaMap);
    addInstanceIDNodeIfMissing(xmlDoc);

    fixAttributes(xmlDoc);

    const model = serializer
        .serializeToString(xmlDoc.querySelector(':root > *'))
        .trim()
        .replace(/^<\?xml .*?\?>/, '');

    // @ts-expect-error - This fails because `xform` is not optional, but this is API-consistent behavior.
    delete survey.xform;
    delete survey.media;
    delete survey.preprocess;
    delete survey.markdown;
    delete survey.openclinica;

    return Object.assign(survey, {
        form,
        model,
        languageMap,
        transformerVersion: PACKAGE_VESION,
    });
};

interface XSLTParams {
    openclinica?: number;
}

const xslTransform = (
    xslStr: string,
    xmlDoc: Document,
    xsltParams: XSLTParams = {} as XSLTParams
) =>
    new Promise<XMLJSDocument>((resolve, reject) => {
        libxslt.parse(xslStr, async (error, stylesheet) => {
            if (stylesheet == null) {
                reject(error);
            } else {
                const xmljsDocument = await domToXMLJS(xmlDoc);

                stylesheet.apply(xmljsDocument, xsltParams, (error, result) => {
                    if (result == null) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            }
        });
    });

const processBinaryDefaults = (
    doc: Document,
    mediaMap: Record<string, string>
) => {
    const binaryBindings = Array.from(
        doc.querySelectorAll(':root > h\\:head > model > bind[type="binary"]')
    );

    binaryBindings.forEach((bind) => {
        const nodeset = bind.getAttribute('nodeset');

        if (nodeset) {
            // This is probably not safe! But it shouldn't last too long ;)
            const relativePath = nodeset.replace(/^\/(?!\/)/, './');
            const query = `:root > h\\:head > model > instance ${xpathToCSS(
                relativePath
            )}`;
            const dataNode = doc.querySelector(query);

            if (dataNode) {
                const text = dataNode.textContent ?? '';

                // TODO (2022-12-30): The comment below is concerning! Why would
                // we not make the pattern more restrictive if we know what we
                // do expect to match?

                // Very crude URL checker which is fine for now,
                // because at this point we don't expect anything other than jr://
                if (/^[a-zA-Z]+:\/\//.test(text)) {
                    const value = getMediaPath(mediaMap, text);
                    const src = value.replace(/&(\w+)=/g, '&amp;$1=');

                    dataNode.setAttribute('src', src);
                    dataNode.textContent = escapeURLPath(text);
                }
            }
        }
    });
};

/**
 * Correct some <setvalue>/<odk:setgeopoint> issues in the XSL stylesheets.
 * This is much easier to correct in javascript than in XSLT
 */
const correctAction = (
    doc: Document,
    action: 'setvalue' | 'setgeopoint' = 'setvalue'
) => {
    /*
     * See setvalue.xml (/data/person/age_changed). A <setvalue> inside a form control results
     * in one label.question with a nested label.setvalue which is weird syntax (and possibly invalid HTML).
     */
    const nestedLabelInputs = doc.querySelectorAll(
        `.question label > input[data-${action}]`
    );

    nestedLabelInputs.forEach((setValueEl) => {
        const { parentElement } = setValueEl;

        if (parentElement == null) {
            return;
        }

        const clone = setValueEl.cloneNode(true);

        parentElement.insertAdjacentElement('afterend', clone);
        parentElement.remove();
    });

    /*
     * See setvalue.xml (/data/person/age). A <setvalue> inside a repeat to set a default value that also has a question with the same name, results
     * in one .question and .setvalue with the same name, which will leads to all kinds of problems in enketo-core
     * as name is presumed to be unique.
     *
     * Note that a label.setvalue is always to set a default value (with odk-new-repeat, odk-instance-first-load), never
     * a value change directive (with xforms-value-changed)
     */
    const nestedNameInputs = doc.querySelectorAll(
        `.${action} > input[data-${action}]`
    );

    nestedNameInputs.forEach((setValueEl) => {
        const name = setValueEl.getAttribute('name');

        if (name == null) {
            return;
        }

        const questionSameName = doc.querySelector(
            `.question > [name="${CSS.escape(
                name
            )}"]:not([type="hidden"]), .option-wrapper > * > [name="${CSS.escape(
                name
            )}"]:not([type="hidden"])`
        );

        if (questionSameName) {
            // Note that if the question has radiobuttons or checkboxes only the first of those gets the setvalue attributes.
            [`data-${action}`, 'data-event'].forEach((name) => {
                questionSameName.setAttribute(
                    name,
                    setValueEl.getAttribute(name) ?? name
                );
            });

            setValueEl.parentElement?.remove();
        }
    });
};

const parseXMLJS = (xmlStr: string) =>
    new Promise<XMLJSDocument>((resolve, reject) => {
        try {
            const doc = libxmljs.parseXml(xmlStr);

            resolve(doc);
        } catch (e) {
            console.log('wat', xmlStr);
            reject(e);
        }
    });

const replaceTheme = (doc: Document, theme: string) => {
    const form = doc.querySelector<HTMLElement>(':root > form');

    if (form == null) {
        return;
    }

    const themeClassName = `theme-${theme}`;
    const classes = Array.from(form.classList);
    const lastIndex = classes.length - 1;

    classes.forEach((className, index) => {
        if (className.startsWith('theme-')) {
            const prefix = index === 0 ? '' : ' ';
            const suffix = index === lastIndex ? '' : ' ';
            const find = `${prefix}${className}${suffix}`;
            const replacement = `${prefix}${themeClassName}${suffix}`;

            form.className = form.className.replace(find, replacement);
        }
    });

    if (!form.classList.contains(themeClassName)) {
        form.className = `${form.className} ${themeClassName}`;
    }
};

const replaceMediaSources = (
    doc: Document,
    mediaMap: Record<string, string>
) => {
    const mediaElements = doc.querySelectorAll('[src], a[href]');

    mediaElements.forEach((mediaEl) => {
        const attribute =
            mediaEl.tagName.toLowerCase() === 'a' ? 'href' : 'src';
        const src = mediaEl.getAttribute(attribute);

        if (src == null) {
            return;
        }

        const replacement = getMediaPath(mediaMap, src);

        if (replacement) {
            mediaEl.setAttribute(attribute, replacement);
        }
    });

    // add form logo <img> element if applicable
    const formLogo = mediaMap['form_logo.png'];
    const formLogoEl = doc.querySelector('.form-logo');

    if (formLogo && formLogoEl) {
        const img = doc.createElement('img');

        img.setAttribute('src', formLogo);
        img.setAttribute('alt', 'form logo');

        formLogoEl.append(img);
    }
};

/**
 * Replaces all lang attributes to the valid IANA tag if found.
 * Also add the dir attribute to the languages in the language selector.
 *
 * @see http://www.w3.org/International/questions/qa-choosing-language-tags
 */
const replaceLanguageTags = (doc: Document) => {
    const languageMap: Record<string, string> = {};

    const languageElements = Array.from(
        doc.querySelectorAll(':root > form > select#form-languages > option')
    );

    // List of parsed language objects
    const languages = languageElements.flatMap((el) => {
        const lang = el.textContent;

        if (lang == null) {
            return [];
        }

        return language.parse(lang, getLanguageSampleText(doc, lang));
    });

    // forms without itext and only one language, still need directionality info
    if (languages.length === 0) {
        languages.push(language.parse('', getLanguageSampleText(doc, '')));
    }

    // add or correct dir and value attributes, and amend textcontent of options in language selector
    languageElements.forEach((el, index) => {
        const val = el.getAttribute('value');

        if (val && val !== languages[index].tag) {
            languageMap[val] = languages[index].tag;
        }

        const { desc, dir, tag } = languages[index];

        el.setAttribute('data-dir', dir);
        el.setAttribute('value', tag);
        el.textContent = desc;
    });

    // correct lang attributes
    languages.forEach(({ src, tag }) => {
        if (src === tag) {
            return;
        }

        const translatedElements = doc.querySelectorAll(
            `:root > form [lang="${CSS.escape(src)}"]`
        );

        translatedElements.forEach((el) => {
            el.setAttribute('lang', tag);
        });
    });

    // correct default lang attribute
    const langSelectorElement = doc.querySelector(
        ':root > form > *[data-default-lang]'
    );

    if (langSelectorElement) {
        const defaultLang =
            langSelectorElement.getAttribute('data-default-lang');

        // TODO: this is a weird use of `some`. It'd probably be better as a
        // loop, even if it would certainly break some lint rule or another
        languages.some((lang) => {
            if (lang.src === defaultLang) {
                langSelectorElement.setAttribute('data-default-lang', lang.tag);

                return true;
            }

            return false;
        });
    }

    return languageMap;
};

/**
 * Obtains a non-empty hint text or other text sample of a particular form language.
 */
const getLanguageSampleText = (doc: Document, language: string) => {
    const escapedLanguage = CSS.escape(language);

    // First find non-empty text content of a hint with that lang attribute.
    // If not found, find any span with that lang attribute.
    const sample = Array.from(
        doc.querySelectorAll(`:root > form span[lang="${escapedLanguage}"]`)
    )
        .sort((a, b) => {
            if (a.classList.contains('or-hint')) {
                return -1;
            }

            if (b.classList.contains('or-hint')) {
                return 1;
            }

            return 0;
        })
        .map((element) => element.textContent?.trim() || '-')
        .find((text) => text !== '-');

    return sample || 'nothing';
};

// TODO (2022-12-31): The below JSDoc has claimed to be temporary for over three years.
/**
 * Temporary function to add a /meta/instanceID node if this is missing.
 * This used to be done in enketo-xslt but was removed when support for namespaces was added.
 */
const addInstanceIDNodeIfMissing = (doc: Document) => {
    let instanceIDEl = doc.querySelector(
        ':root > model > instance meta > instanceID, :root > model > instance orx\\:meta > orx\\:instanceID'
    );

    if (instanceIDEl == null) {
        const rootEl = doc.querySelector(':root > model > instance > *');

        if (rootEl == null) {
            throw new Error('Missing primary instance root');
        }

        let metaEl: Element | null = rootEl.querySelector('meta');

        if (metaEl == null) {
            metaEl = doc.createElement('meta');
            rootEl.append(metaEl);
        }

        instanceIDEl = doc.createElement('instanceID');

        metaEl.append(instanceIDEl);
    }
};

/**
 * Converts a subset of Markdown in all textnode children of labels and hints into HTML
 */
const renderMarkdown = (
    htmlDoc: Document,
    mediaMap: Record<string, string>
) => {
    const form = htmlDoc.querySelector(':root > form');

    if (form == null) {
        throw new Error('Form is missing');
    }

    const labelHintElements = form.querySelectorAll(
        'span.question-label, span.or-hint'
    );

    labelHintElements.forEach((element) => {
        const outputs = Array.from(element.querySelectorAll('span.or-output'));
        const substitutions = outputs.map((output, index) => ({
            output,
            substitution: `<!-- output-${index} -->`,
        }));

        for (const { output, substitution } of substitutions) {
            output.replaceWith(substitution);
        }

        /**
         * Using textCondtent is done because:
         *
         * a) We are certain that these <span>s do not contain other elements, other than formatting/markdown <span>s.
         * b) This avoids the need to merge any sibling text nodes that could have been created in the previous step.
         *
         * Note that textCondtent will convert &gt; to >
         */
        const original = (element.textContent ?? '')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const rendered = markdownToHTML(original);

        const parsed = parser.parseFromString(
            `<!DOCTYPE html><html><body><div class="temporary-root">${rendered}</div></body></html>`,
            'text/html'
        );

        replaceMediaSources(parsed.documentElement, mediaMap);

        const root = parsed.documentElement.querySelector(
            '.temporary-root'
        ) as Element;
        const treeWalker = htmlDoc.createTreeWalker(
            root,
            NodeFilterType.SHOW_COMMENT
        );

        while (treeWalker.nextNode() != null) {
            const comment = treeWalker.currentNode as Comment;
            const { nodeValue } = comment;
            const [, outputIndex] =
                nodeValue?.trim().match(/^output-(\d+)$/) ?? [];

            if (outputIndex != null) {
                const index = Number(outputIndex);
                const output = outputs[index];

                comment.replaceWith(output);
            }
        }

        const children = Array.from(root.childNodes);

        element.replaceChildren(...children);
    });
};

const md5 = (message: string | Buffer) => {
    const hash = crypto.createHash('md5');
    hash.update(message);

    return hash.digest('hex');
};

const PACKAGE_VESION = pkg.version;

const VERSION = md5(xslForm + xslModel + PACKAGE_VESION);

export { VERSION as version };

export const sheets = {
    xslForm,
    xslModel,
};

export { escapeURLPath };

/**
 * Exported for backwards compatibility, prefer named imports from enketo-transformer's index module.
 */
export default {
    transform,
    version: VERSION,
    NAMESPACES,
    sheets,
    escapeURLPath,
};
