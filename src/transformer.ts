import { parseHTML, parseXML, serializeHTML, serializeXML } from './dom';
import { parseLanguage } from './language';
import { markdownToHTML } from './markdown';
import { NAMESPACES, sheets, version } from './shared';
import type { TransformedSurvey } from './shared';
import { escapeURLPath, getMediaPath } from './url';

export * from './shared';

type PreprocessXForm = (xform: string) => string;

export interface TransformOptions {
    markdown?: boolean;
    media?: Record<string, string>;
    openclinica?: boolean | number;

    /**
     * @deprecated - Historically there was a `preprocess` option, allowing
     * users to alter or correct their XForms before transformation. This option
     * unfortunately leaked an implementation detail, namely that transforms
     * were then performed with the `libxslt` library and its transitive
     * dependency, `node1-libxmljsmt-myh` (a fork of `libxmljs`). Those
     * dependencies can't be run on the web.
     *
     * @see {@link preprocessXForm}
     * @see {@link import('./node').Survey}
     */
    preprocess?: never;

    /**
     * This option replaces `preprocess`, but it isn't especially useful. It's functionally equivalent to calling the same function before calling {@link transform}.
     */
    preprocessXForm?: PreprocessXForm;

    theme?: string;
}

interface BaseSurvey {
    xform: string;
}

export type Survey = BaseSurvey & TransformOptions;

/**
 * Performs XSLT transformation on XForm and process the result.
 */
export const transform = async (survey: Survey): Promise<TransformedSurvey> => {
    const xslFormDocument = parseXML(sheets.xslForm);
    const xslModelDocument = parseXML(sheets.xslModel);
    const {
        xform,
        markdown,
        media,
        openclinica,
        preprocessXForm = (value) => value,
        theme,
    } = survey;

    const xsltParams = openclinica
        ? {
              openclinica: 1,
          }
        : {};

    const mediaMap = Object.fromEntries(
        Object.entries(media || {}).map((entry) => entry.map(escapeURLPath))
    );

    const preprocessed = preprocessXForm(xform);
    const xformDoc = parseXML(preprocessed);

    processBinaryDefaults(xformDoc, mediaMap);

    const htmlDoc = xslTransform(xslFormDocument, xformDoc, xsltParams);

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

    const form = serializeHTML(htmlDoc);
    const xmlDoc = xslTransform(xslModelDocument, xformDoc);

    correctModelNamespaces(xslModelDocument, xformDoc, xmlDoc);
    replaceMediaSources(xmlDoc, mediaMap);
    addInstanceIDNodeIfMissing(xmlDoc);

    const model = serializeXML(xmlDoc);

    return {
        form,
        model,
        languageMap,
        transformerVersion: PACKAGE_VERSION,
    };
};

interface XSLTParams {
    openclinica?: number;
}

const xslTransform = (
    xsl: XMLDocument,
    xform: XMLDocument,
    xsltParams: XSLTParams = {} as XSLTParams
) => {
    const processor = new XSLTProcessor();

    processor.importStylesheet(xsl);

    Object.entries(xsltParams).forEach(([parameter, value]) => {
        processor.setParameter(null, parameter, value);
    });

    const targetDocument = document.implementation.createDocument(
        NAMESPACES.xmlns,
        `root`
    );
    const transformed = processor.transformToFragment(xform, targetDocument);

    targetDocument.documentElement.replaceWith(transformed);

    return targetDocument;
};

/**
 * For some odd reason, the typings for `createNSResolver` suggest that it may return a function, but it never does.
 */
type NamespaceResolver = Exclude<XPathNSResolver, (prefix: any) => any>;

const namespaceResolverCache = new WeakMap<Document, NamespaceResolver>();

/**
 * Provides an XML namespace resolver for evaluating XPath expressions with the
 * provided {@link doc}. We attempt to defer to the native namespace resolver
 * where possible, then fall back to hard-coded {@link NAMESPACES} mapping for
 * expressions using namespaces not explicitly defined on the document (most
 * commonly `xmlns`).
 *
 * TODO (2023-01-18): this logic may be useful downstream, particularly to
 * address issues with the behavior of {@link correctModelNamespaces}. I'm
 * exporting it now, as an opportunity to explore that after this is merged.
 * Maybe we should also document it?
 */
export const getNamespaceResolver = (doc: Document) => {
    const cached = namespaceResolverCache.get(doc);

    if (cached != null) {
        return cached;
    }

    const baseResolver = doc.createNSResolver(doc) as NamespaceResolver;
    const defaultPrefix = doc.lookupPrefix(NAMESPACES.xmlns);
    const resolver = {
        lookupNamespaceURI(prefix: string) {
            if (
                prefix === defaultPrefix ||
                (defaultPrefix == null && prefix === 'xmlns')
            ) {
                return NAMESPACES.xmlns;
            }

            return (
                baseResolver.lookupNamespaceURI(prefix) ??
                NAMESPACES[prefix as keyof typeof NAMESPACES]
            );
        },
    };

    namespaceResolverCache.set(doc, resolver);

    return resolver;
};

const getNodesByXPathExpression = <T extends Node = Element>(
    doc: XMLDocument,
    expression: string,
    context: Element = doc.documentElement
): T[] => {
    const results: T[] = [];
    const namespaceResolver = getNamespaceResolver(doc);
    const result = doc.evaluate(
        expression,
        context,
        namespaceResolver,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
    );

    for (let i = 0; i < result.snapshotLength; i += 1) {
        results.push(result.snapshotItem(i) as T);
    }

    return results;
};

const processBinaryDefaults = (
    doc: Document,
    mediaMap: Record<string, string>
) => {
    const binaryBindings = Array.from(
        doc.querySelectorAll(':root > head > model > bind[type="binary"]')
    );

    binaryBindings.forEach((bind) => {
        const nodeset = bind.getAttribute('nodeset');

        if (nodeset) {
            const expression = `/h:html/h:head/xmlns:model/xmlns:instance/xmlns:${nodeset
                .trim()
                .replace(/^\//, '')
                .replace(/\//g, `/xmlns:`)}`;
            const dataNodes = getNodesByXPathExpression(doc, expression);

            dataNodes.forEach((dataNode) => {
                if (dataNode instanceof Element) {
                    const text = dataNode.textContent?.trim() ?? '';

                    // TODO (2022-12-30): The comment below is concerning! Why would
                    // we not make the pattern more restrictive if we know what we
                    // do expect to match?

                    // Very crude URL checker which is fine for now,
                    // because at this point we don't expect anything other than jr://
                    if (/^[a-zA-Z]+:\/\//.test(text)) {
                        const src = getMediaPath(mediaMap, text);

                        dataNode.setAttribute('src', src);
                        dataNode.textContent = escapeURLPath(text);
                    } else if (text !== '') {
                        dataNode.setAttribute('src', escapeURLPath(text));
                        dataNode.textContent = escapeURLPath(text);
                    }
                }
            });
        }
    });
};

const XMLNS_URI = 'http://www.w3.org/2000/xmlns/';

/**
 * This addresses a difference in how Firefox treats XML namespace declarations
 * versus other browsers, as well as `libxslt`. In `openrosa2xmlmodel.xsl`, it's
 * expected that `xmlns` and `xmlns:*` are treated as attributes, but evidently
 * this is not the case in Firefox. So for consistency we copy the namespace
 * declarations in the browser DOM.
 *
 * An important note: understanding what the actual behavior originally was
 * turned out to be rather difficult, so this is the current behavior (which may
 * not exactly be *expected* e.g. by Enketo Core):
 *
 * For each namespace declaration defined on the XForm's root `html` element,
 * assign them to the transformed model's primary `instance` element, **except if**:
 *
 * - The namespace is also defined on the `model`.
 * - The namespace prefix is used on any of the `model`'s attributes.
 * - The namespace is also defined in `openrosa2xmlmodel.xsl`.
 *
 * TODO (2023-01-16):
 *
 * - All of the exceptions described above are either known bugs or likely to be.
 *
 * - This leaves very little remaining responsibilities of
 *   `openrosa2xmlmodel.xsl`. We should seriously consider moving the remainder
 *   to DOM code.
 */
const correctModelNamespaces = (
    xslDoc: XMLDocument,
    xformDoc: XMLDocument,
    modelDoc: XMLDocument
) => {
    const { documentElement: xslRoot } = xslDoc;
    const instanceRoots = modelDoc.querySelectorAll(
        ':root > model > instance > *'
    );
    const model = modelDoc.querySelector(':root > model');
    const xformModel = xformDoc.querySelector(':root > head > model');

    if (model == null || xformModel == null) {
        throw new Error('XForm is missing a model element.');
    }

    instanceRoots.forEach((instanceRoot) => {
        const xformModelAttrNamespaces = [...xformModel.attributes]
            .filter(
                ({ name }) => name !== 'xmlns' && !name.startsWith('xmlns:')
            )
            .map(({ namespaceURI }) => namespaceURI);

        const missingNamespaceAttrs = [
            ...xformDoc.documentElement.attributes,
        ].filter(
            ({ name, value }) =>
                (name === 'xmlns' || name.startsWith('xmlns:')) &&
                !xslRoot.hasAttribute(name) &&
                !xformModelAttrNamespaces.includes(value) &&
                !instanceRoot.hasAttribute(name)
        );

        missingNamespaceAttrs.forEach(({ name, value }) => {
            try {
                instanceRoot.setAttributeNS(XMLNS_URI, name, value);
            } catch {
                // TODO was this temporary?
            }
        });
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
        const img = doc.createElementNS(NAMESPACES.h, 'img');

        img.setAttribute('alt', 'form logo');
        img.setAttribute('src', formLogo);

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

        return parseLanguage(lang, getLanguageSampleText(doc, lang));
    });

    // forms without itext and only one language, still need directionality info
    if (languages.length === 0) {
        languages.push(parseLanguage('', getLanguageSampleText(doc, '')));
    }

    // add or correct dir and value attributes, and amend textcontent of options in language selector
    languageElements.forEach((el, index) => {
        const val = el.getAttribute('value');

        if (val && val !== languages[index].tag) {
            languageMap[val] = languages[index].tag;
        }

        const { description, directionality, tag } = languages[index];

        el.setAttribute('data-dir', directionality);
        el.setAttribute('value', tag);
        el.textContent = description;
    });

    // correct lang attributes
    languages.forEach(({ sourceLanguage, tag }) => {
        if (sourceLanguage === tag) {
            return;
        }

        const translatedElements = doc.querySelectorAll(
            `:root > form [lang="${CSS.escape(sourceLanguage)}"]`
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
        languages.some(({ sourceLanguage, tag }) => {
            if (sourceLanguage === defaultLang) {
                langSelectorElement.setAttribute('data-default-lang', tag);

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
    const rootEl = doc.querySelector(':root > model > instance > *');
    let instanceIDEl = doc.querySelector(
        ':root > model > instance meta > instanceID'
    );

    if (instanceIDEl == null) {
        if (rootEl == null) {
            throw new Error('Missing primary instance root');
        }

        let metaEl: Element | null = rootEl.querySelector('meta');

        if (metaEl == null) {
            metaEl = doc.createElementNS(NAMESPACES.xmlns, 'meta');
            rootEl.append(metaEl);
        }

        instanceIDEl = doc.createElementNS(NAMESPACES.xmlns, 'instanceID');

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
        const parsed = parseHTML(
            `<!DOCTYPE html><html><body><div class="temporary-root">${rendered}</div></body></html>`
        );

        replaceMediaSources(parsed, mediaMap);

        const root = parsed.documentElement.querySelector(
            '.temporary-root'
        ) as Element;
        const treeWalker = htmlDoc.createTreeWalker(
            root,
            NodeFilter.SHOW_COMMENT
        );

        const comments: Comment[] = [];

        while (treeWalker.nextNode() != null) {
            const comment = treeWalker.currentNode as Comment;

            comments.push(comment);
        }

        comments.forEach((comment) => {
            const { nodeValue } = comment;
            const [, outputIndex] =
                nodeValue?.trim().match(/^output-(\d+)$/) ?? [];

            if (outputIndex != null) {
                const index = Number(outputIndex);
                const output = outputs[index];

                comment.replaceWith(output);
            }
        });

        const children = Array.from(root.childNodes);

        element.replaceChildren(...children);
    });
};

/**
 * Exported for backwards compatibility, prefer named imports from enketo-transformer's index module.
 */
export default {
    transform,
    version,
    NAMESPACES,
    sheets,
    escapeURLPath,
};
