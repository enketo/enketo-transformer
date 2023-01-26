/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/libxmljs.d.ts" />

import type libxmljs from 'libxmljs';
import type { Document as XMLJSDocument } from 'libxmljs';
import { firefox as headless } from 'playwright';
import { createServer } from 'vite';
import { pathToFileURL } from 'url';
import { define } from '../config/build.shared';
import { resolvePath, rootDir } from '../tools/shared';
import type { TransformedSurvey } from './shared';
import type { Survey as BaseSurvey } from './transformer';

const isProduction = ENV === 'production';

/**
 * @private
 *
 * There is no need to call this function, but it ensures that changes during
 * development are detected in dev/test watch mode
 */
export const recognizeDependencies = () => {
    if (isProduction) {
        import.meta.glob('./**/*.{xsl,ts}');
    }
};

const firefoxUserPrefs = {
    'browser.cache.memory.capacity': 65536,
    'browser.chrome.toolbar_style': 1,
    'browser.display.show_image_placeholders': false,
    'browser.display.use_document_colors': false,
    'browser.display.use_document_fonts': 0,
    'browser.display.use_system_colors': true,
    'browser.formfill.enable': false,
    'browser.helperApps.deleteTempFileOnExit': true,
    'browser.pocket.enabled': false,
    'browser.shell.checkDefaultBrowser': false,
    'browser.startup.homepage': 'about:blank',
    'browser.startup.page': 0,
    'browser.tabs.forceHide': true,
    'browser.urlbar.autocomplete.enabled': false,
    'browser.urlbar.autoFill': false,
    'browser.urlbar.showPopup': false,
    'browser.urlbar.showSearch': false,
    'content.notify.interval': 500000,
    'content.notify.ontimer': true,
    'content.switch.threshold': 250000,
    'extensions.checkCompatibility': false,
    'extensions.checkUpdateSecurity': false,
    'extensions.update.autoUpdateEnabled': false,
    'extensions.update.enabled': false,
    'general.startup.browser': false,
    'loop.enabled': false,
    'network.http.pipelining.maxrequests': 8,
    'network.http.pipelining': true,
    'network.http.proxy.pipelining': true,
    'permissions.default.image': 2,
    'plugin.default_plugin_disabled': false,
    'reader.parse-on-load.enabled': false,
};

const getPage = async () => {
    const configFile = resolvePath('./vite.web.ts');
    const mode = isProduction ? 'production' : 'development';
    const useServer = !isProduction;

    try {
        const [browser, server] = await Promise.all([
            headless.launch({
                headless: true,
                firefoxUserPrefs,
            }),
            useServer
                ? createServer({
                      configFile,
                      mode,
                      build: {
                          target: 'modules',
                      },
                      define,
                      root: rootDir,
                  })
                : null,
        ]);

        const [page] = await Promise.all([browser.newPage(), server?.listen()]);

        server?.printUrls();

        process.once('beforeExit', async () =>
            Promise.all([browser.close(), server?.close()])
        );

        const url =
            server?.resolvedUrls?.local[0] ??
            pathToFileURL(resolvePath('./dist/index.html')).href;

        if (url == null) {
            throw new Error('Server startup failed');
        }

        page.on('console', (message) => {
            console.log(message.text());
        });

        await page.goto(url);
        await page.waitForFunction(() => typeof enketo !== 'undefined');

        return page;
    } catch (error) {
        console.error('Launching the browser bridge failed, got error', error);

        // Wait for stdout to flush.
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });

        process.exit(1);
    }
};

const pagePromise = getPage();

type LibXMLJS = typeof libxmljs;

export type PreprocessFunction = (
    this: LibXMLJS,
    doc: XMLJSDocument
) => XMLJSDocument;

const legacyPreprocess = async (
    xform: string,
    preprocess: PreprocessFunction
) => {
    let libxmljs: LibXMLJS | null = null;

    try {
        libxmljs = await import('node1-libxmljsmt-myh');
    } catch {
        try {
            libxmljs = await import('libxmljs');
        } catch {
            throw new Error(
                'You must install `libxmljs` to use the `preprocess` option.'
            );
        }
    }

    const doc = libxmljs.parseXml(xform);
    const preprocessed = preprocess.call(libxmljs, doc);

    return preprocessed.toString(false);
};

export interface Survey extends Omit<BaseSurvey, 'preprocess'> {
    preprocess?: PreprocessFunction;
}

declare const enketo: {
    transformer: {
        transform: <T>(
            survey: Survey & T
        ) => Promise<TransformedSurvey<Omit<T, keyof Survey>>>;
    };
};

export const transform = async <T extends Survey>(survey: T) => {
    const { preprocess, xform: baseXForm, ...options } = survey;

    let xform = baseXForm;

    if (typeof preprocess === 'function') {
        xform = await legacyPreprocess(xform, preprocess);
    }

    const page = await pagePromise;

    const result = await page.evaluate(
        /* eslint-disable @typescript-eslint/no-shadow */
        async ([input]) => {
            const browserResult = await enketo.transformer.transform(
                input as Survey & T
            );

            return browserResult;
        },
        /* eslint-enable @typescript-eslint/no-shadow */

        [{ ...options, xform }]
    );

    return result;
};

export * from './shared';
