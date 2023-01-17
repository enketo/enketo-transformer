import { firefox as headless } from 'playwright';
import type { Page } from 'playwright';
import { createServer } from 'vite';
import {
    baseConfig,
    define,
    resolvePath,
    rootDir,
} from '../config/build.shared';
import '../index.html?raw';

/**
 * @private
 *
 * There is no need to call this function, but it ensures that changes during
 * development are detected in dev/test watch mode
 */
export const recognizeDependencies = () => import.meta.glob('./**/*.{xsl,ts}');

let pagePromise: Promise<Page> | null = null;
let currentPage: Page | null = null;

const getPage = async () => {
    if (pagePromise != null) {
        currentPage = await pagePromise;

        return currentPage;
    }

    if (currentPage != null) {
        return currentPage;
    }

    const configFile = resolvePath('./vite.web.ts');

    try {
        const [browser, server] = await Promise.all([
            headless.launch({
                headless: true,
            }),
            createServer({
                configFile,
                mode: 'development',
                build: {
                    target: 'modules',
                },
                define,
                plugins: [...(baseConfig.plugins ?? [])],
                root: rootDir,
            }),
        ]);

        const [page] = await Promise.all([
            browser.newPage({
                bypassCSP: true,
                deviceScaleFactor: 0.01,
            }),
            server.listen(),
        ]);

        server.printUrls();

        process.once('beforeExit', async () =>
            Promise.all([browser.close(), server.close()])
        );

        if (server.resolvedUrls == null) {
            throw new Error('Server startup failed');
        }

        page.on('console', (message) => {
            console.log(message.text());
        });

        await page.goto(server.resolvedUrls.local[0], {
            waitUntil: 'load',
        });

        currentPage = page;

        await page.waitForLoadState('networkidle');

        const content = await page.content();

        await page.waitForFunction(() => enketo != null);

        if (!content.includes('Enketo Transformer')) {
            console.error(
                'Launching the browser bridge failed, got page content',
                content,
                'urls',
                server.resolvedUrls
            );
            process.exit(1);
        }

        return currentPage;
    } catch (error) {
        console.error('Launching the browser bridge failed, got error', error);

        process.exit(1);
    }
};

pagePromise = getPage();

declare const enketo: {
    transformer: {
        transform: (survey: any) => Promise<any>;
    };
};

export const transform = async (survey: any) => {
    const page = await getPage();

    const [error, result] = await page.evaluate(
        /* eslint-disable @typescript-eslint/no-shadow */
        async ([input]) => {
            let transformed: any = null;
            let caught: any = null;

            try {
                transformed = await enketo.transformer.transform(input);
            } catch (error) {
                const { message, stack } = error as Error;

                caught = {
                    message,
                    stack,
                };

                console.log('caught', caught);
            }

            return [caught, transformed];
        },
        /* eslint-enable @typescript-eslint/no-shadow */

        [survey] as const
    );

    if (error == null) {
        return result;
    }

    throw Object.assign(new Error(error.message), error);
};
