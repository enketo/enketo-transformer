import crypto from 'crypto';
import libxslt from 'libxslt';
import type {
    Document as XMLJSDocument,
    DocumentFragment as XMLJSDocumentFragment,
} from 'libxmljs';
import pkg from '../package.json';
import xslForm from './xsl/openrosa2html5form.xsl?raw';
import xslModel from './xsl/openrosa2xmlmodel.xsl?raw';
import { parseLanguage } from './language';
import { markdownToHTML } from './markdown';
import { escapeURLPath, getMediaPath } from './url';

const { libxmljs } = libxslt;

export const NAMESPACES = {
    xmlns: 'http://www.w3.org/2002/xforms',
    orx: 'http://openrosa.org/xforms',
    h: 'http://www.w3.org/1999/xhtml',
} as const;

type LibXMLJS = typeof libxmljs;

export type TransformPreprocess = (
    this: LibXMLJS,
    doc: XMLJSDocument
) => XMLJSDocument;

export interface Survey {
    xform: string;
    markdown?: boolean;
    media?: Record<string, string>;
    openclinica?: boolean | number;
    preprocess?: TransformPreprocess;
    theme?: string;
}

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

    const doc = await parseXML(xform);
    const xformDoc =
        typeof preprocess === 'function' ? preprocess.call(libxmljs, doc) : doc;

    processBinaryDefaults(xformDoc, mediaMap);

    const htmlDoc = await xslTransform(xslForm, xformDoc, xsltParams);

    correctAction(htmlDoc, 'setgeopoint');
    correctAction(htmlDoc, 'setvalue');
    replaceTheme(htmlDoc, theme);
    replaceMediaSources(htmlDoc, mediaMap);

    const languageMap = replaceLanguageTags(htmlDoc);
    const form =
        markdown !== false
            ? renderMarkdown(htmlDoc, mediaMap)
            : docToString(htmlDoc);
    const xmlDoc = await xslTransform(xslModel, xformDoc);

    replaceMediaSources(xmlDoc, mediaMap);
    addInstanceIdNodeIfMissing(xmlDoc);

    const model = docToString(xmlDoc);

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
    xmlDoc: XMLJSDocument,
    xsltParams: XSLTParams = {} as XSLTParams
) =>
    new Promise<XMLJSDocument>((resolve, reject) => {
        libxslt.parse(xslStr, (error, stylesheet) => {
            if (stylesheet == null) {
                reject(error);
            } else {
                stylesheet.apply(xmlDoc, xsltParams, (error, result) => {
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
    doc: XMLJSDocument,
    mediaMap: Record<string, string>
) => {
    doc.find(
        '/h:html/h:head/xmlns:model/xmlns:bind[@type="binary"]',
        NAMESPACES
    ).forEach((bind) => {
        const nodeset = bind.attr('nodeset');

        if (nodeset && nodeset.value()) {
            const path = `/h:html/h:head/xmlns:model/xmlns:instance${nodeset
                .value()
                ?.replace(/\//g, '/xmlns:')}`;
            const dataNode = doc.get(path, NAMESPACES);

            if (dataNode) {
                const text = dataNode.text();

                // Very crude URL checker which is fine for now,
                // because at this point we don't expect anything other than jr://
                if (/^[a-zA-Z]+:\/\//.test(text)) {
                    const value = getMediaPath(mediaMap, text);
                    const escapedText = escapeURLPath(text);

                    dataNode.attr({ src: value }).text(escapedText);
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
    doc: XMLJSDocument,
    localName: 'setvalue' | 'setgeopoint' = 'setvalue'
) => {
    /*
     * See setvalue.xml (/data/person/age_changed). A <setvalue> inside a form control results
     * in one label.question with a nested label.setvalue which is weird syntax (and possibly invalid HTML).
     */
    doc.find(
        `//*[contains(@class, "question")]//label/input[@data-${localName}]`
    ).forEach((setValueEl) => {
        const clone = setValueEl.clone();
        setValueEl.parent()?.addNextSibling(clone);
        setValueEl.parent()?.remove();
    });

    /*
     * See setvalue.xml (/data/person/age). A <setvalue> inside a repeat to set a default value that also has a question with the same name, results
     * in one .question and .setvalue with the same name, which will leads to all kinds of problems in enketo-core
     * as name is presumed to be unique.
     *
     * Note that a label.setvalue is always to set a default value (with odk-new-repeat, odk-instance-first-load), never
     * a value change directive (with xforms-value-changed)
     */
    doc.find(
        `//label[contains(@class, "${localName}")]/input[@data-${localName}]`
    ).forEach((setValueEl) => {
        const name = setValueEl.attr('name')?.value();
        const questionSameName = doc.get(
            `//*[@name="${name}" and ( contains(../@class, 'question') or contains(../../@class, 'option-wrapper')) and not(@type='hidden')]`
        );
        if (questionSameName) {
            // Note that if the question has radiobuttons or checkboxes only the first of those gets the setvalue attributes.
            [`data-${localName}`, 'data-event'].forEach((name) => {
                questionSameName.attr(
                    name,
                    setValueEl.attr(name)?.value() ?? name
                );
            });
            setValueEl.parent()?.remove();
        }
    });
};

const parseXML = (xmlStr: string) =>
    new Promise<XMLJSDocument>((resolve, reject) => {
        try {
            const doc = libxmljs.parseXml(xmlStr);

            resolve(doc);
        } catch (e) {
            reject(e);
        }
    });

const replaceTheme = (doc: XMLJSDocument, theme?: string) => {
    const HAS_THEME = /(theme-)[^"'\s]+/;

    if (!theme) {
        return;
    }

    const formClassAttr = doc.root().get('/root/form')?.attr('class');

    if (formClassAttr == null) {
        return;
    }

    const formClassValue = formClassAttr.value();

    if (
        formClassAttr != null &&
        formClassValue != null &&
        HAS_THEME.test(formClassValue)
    ) {
        formClassAttr.value(formClassValue.replace(HAS_THEME, `$1${theme}`));
    } else {
        formClassAttr.value(`${formClassValue} theme-${theme}`);
    }
};

const replaceMediaSources = <T extends XMLJSDocument | XMLJSDocumentFragment>(
    root: T,
    mediaMap?: Record<string, string>
) => {
    if (!mediaMap) {
        return;
    }

    // iterate through each element with a src attribute
    root.find('//*[@src] | //a[@href]').forEach((mediaEl) => {
        const attribute = mediaEl.name().toLowerCase() === 'a' ? 'href' : 'src';
        const src = mediaEl.attr(attribute)?.value();

        if (src == null) {
            return;
        }

        const replacement = getMediaPath(mediaMap, src);

        if (replacement) {
            mediaEl.attr(attribute, replacement);
        }
    });

    // add form logo <img> element if applicable
    const formLogo = mediaMap['form_logo.png'];
    const formLogoEl = root.get('//*[@class="form-logo"]');
    if (formLogo && formLogoEl) {
        formLogoEl.node('img').attr('src', formLogo).attr('alt', 'form logo');
    }
};

/**
 * Replaces all lang attributes to the valid IANA tag if found.
 * Also add the dir attribute to the languages in the language selector.
 *
 * @see http://www.w3.org/International/questions/qa-choosing-language-tags
 */
const replaceLanguageTags = (doc: XMLJSDocument) => {
    const languageMap: Record<string, string> = {};

    const languageElements = doc.find(
        '/root/form/select[@id="form-languages"]/option'
    );

    // List of parsed language objects
    const languages = languageElements.map((el) => {
        const lang = el.text();

        return parseLanguage(lang, getLanguageSampleText(doc, lang));
    });

    // forms without itext and only one language, still need directionality info
    if (languages.length === 0) {
        languages.push(parseLanguage('', getLanguageSampleText(doc, '')));
    }

    // add or correct dir and value attributes, and amend textcontent of options in language selector
    languageElements.forEach((el, index) => {
        const val = el.attr('value')?.value();
        if (val && val !== languages[index].tag) {
            languageMap[val] = languages[index].tag;
        }
        el.attr({
            'data-dir': languages[index].directionality,
            value: languages[index].tag,
        }).text(languages[index].description);
    });

    // correct lang attributes
    languages.forEach(({ sourceLanguage, tag }) => {
        if (sourceLanguage === tag) {
            return;
        }
        doc.find(`/root/form//*[@lang="${sourceLanguage}"]`).forEach((el) => {
            el.attr({
                lang: tag,
            });
        });
    });

    // correct default lang attribute
    const langSelectorElement = doc.get('/root/form/*[@data-default-lang]');
    if (langSelectorElement) {
        const defaultLang = langSelectorElement
            .attr('data-default-lang')
            ?.value();
        languages.some(({ sourceLanguage, tag }) => {
            if (sourceLanguage === defaultLang) {
                langSelectorElement.attr({
                    'data-default-lang': tag,
                });

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
const getLanguageSampleText = (doc: XMLJSDocument, language: string) => {
    // First find non-empty text content of a hint with that lang attribute.
    // If not found, find any span with that lang attribute.
    const langSampleEl =
        doc.get(
            `/root/form//span[contains(@class, "or-hint") and @lang="${language}" and normalize-space() and not(./text() = '-')]`
        ) ||
        doc.get(
            `/root/form//span[@lang="${language}" and normalize-space() and not(./text() = '-')]`
        );

    return langSampleEl?.text().trim() || 'nothing';
};

/**
 * Temporary function to add a /meta/instanceID node if this is missing.
 * This used to be done in enketo-xslt but was removed when support for namespaces was added.
 */
const addInstanceIdNodeIfMissing = (doc: XMLJSDocument) => {
    const xformsPath =
        '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta/xmlns:instanceID';
    const openrosaPath =
        '/xmlns:root/xmlns:model/xmlns:instance/*/orx:meta/orx:instanceID';
    const instanceIdEl = doc.get(`${xformsPath} | ${openrosaPath}`, NAMESPACES);

    if (!instanceIdEl) {
        const rootEl = doc.get(
            '/xmlns:root/xmlns:model/xmlns:instance/*',
            NAMESPACES
        );
        const metaEl = doc.get(
            '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta',
            NAMESPACES
        );

        if (metaEl) {
            metaEl.node('instanceID');
        } else if (rootEl) {
            rootEl.node('meta').node('instanceID');
        }
    }
};

/**
 * Converts a subset of Markdown in all textnode children of labels and hints into HTML
 */
const renderMarkdown = (
    htmlDoc: XMLJSDocument,
    mediaMap: Record<string, string>
) => {
    const replacements: Record<string, string> = {};

    // First turn all outputs into text so *<span class="or-output></span>* can be detected
    htmlDoc
        .find('/root/form//span[contains(@class, "or-output")]')
        .forEach((el, index) => {
            const key = `---output-${index}`;
            const textNode = el.childNodes()[0].clone();
            replacements[key] = el.toString();
            textNode.text(key);
            el.replace(textNode);
            // Note that we end up in a situation where we likely have sibling text nodes...
        });

    // Now render markdown
    htmlDoc
        .find(
            '/root/form//span[contains(@class, "question-label") or contains(@class, "or-hint")]'
        )
        .forEach((el, index) => {
            let key;
            /**
             * Using text() is done because:
             * a) We are certain that these <span>s do not contain other elements, other than formatting/markdown <span>s.
             * b) This avoids the need to merge any sibling text nodes that could have been created in the previous step.
             *
             * Note that text() will convert &gt; to >
             */
            const original = el
                .text()
                .replace('<', '&lt;')
                .replace('>', '&gt;');
            let rendered = markdownToHTML(original);

            if (original !== rendered) {
                const fragment = libxmljs.parseHtmlFragment(
                    `<div class="temporary-root">${rendered}</div>`
                );

                replaceMediaSources(fragment, mediaMap);

                rendered = fragment
                    .root()
                    .childNodes()
                    .map((node) => node.toString(false))
                    .join('');

                key = `$$$${index}`;
                replacements[key] = rendered;
                el.text(key);
            }
        });

    // TODO: does this result in self-closing tags?
    let htmlStr = docToString(htmlDoc);

    // Now replace the placeholders with the rendered HTML
    // in reverse order so outputs are done last
    Object.keys(replacements)
        .reverse()
        .forEach((key) => {
            const replacement = replacements[key];
            if (replacement) {
                /**
                 * The replacement is called as a function here so special string
                 * replacement sequences are preserved if they appear within Markdown.
                 *  @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement}
                 */
                htmlStr = htmlStr.replace(key, () => replacement);
            }
        });

    return htmlStr;
};

const docToString = (doc: XMLJSDocument) => {
    const element = doc.root().get('*');

    if (element == null) {
        throw new Error('Document has no elements');
    }

    // TODO: does this result in self-closing tags?
    return element.toString(false);
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
