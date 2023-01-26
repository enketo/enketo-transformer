/* eslint-disable jsx-a11y/label-has-associated-control */
import {
    Router,
    Routes,
    Route,
    useIsRouting,
    useSearchParams,
} from '@solidjs/router';
import { transform } from 'enketo-transformer/web';
import { createEffect, createResource, createSignal, on, Show } from 'solid-js';
import { For, render } from 'solid-js/web';
import { fixtures as baseFixtures } from '../test/shared';

const fixtures = baseFixtures.sort((A, B) => {
    const a = A.fileName.toLowerCase().replace(/.*\/([^/]+)$/, '$1');
    const b = B.fileName.toLowerCase().replace(/.*\/([^/]+)$/, '$1');

    if (a > b) {
        return 1;
    }

    return b > a ? -1 : 0;
});

const xformsByFileName = new Map(
    fixtures.map((fixture) => [fixture.fileName, fixture.xform])
);

function Demo() {
    const [params, setParams] = useSearchParams();
    const isRouting = useIsRouting();
    const [fileName, setFileName] = createSignal<string | null>(params.xform);
    const xform = () => xformsByFileName.get(params.xform);
    const [error, setError] = createSignal<Error | null>(null);
    const logo = () => params.logo !== 'false';
    const openclinica = () => params.openclinica === 'true';
    const markdown = () => params.markdown !== 'false';
    const preprocess = () => params.preprocess === 'true';
    const theme = () => params.theme === 'true';
    const [duration, setDuration] = createSignal<number | null>(null);
    const [transformed, setTransformed] = createResource(async () => {
        const selected = xform();

        if (selected == null) {
            return;
        }

        const start = performance.now();
        const result = await transform({
            xform: selected,
            media: logo() ? { 'form_logo.png': '/icon.png' } : {},
            openclinica: openclinica() ? 1 : 0,
            markdown: markdown(),
            theme: theme() ? 'mytheme' : undefined,
        });

        setDuration(performance.now() - start);

        return result;
    });

    createEffect(
        on(
            [
                fileName,
                xform,
                error,
                logo,
                openclinica,
                markdown,
                preprocess,
                theme,
                isRouting,
            ],
            () => {
                setTransformed.refetch();
            }
        )
    );

    return (
        <>
            <h1>
                <a href="/">Enketo Transformer Demo</a>
            </h1>
            <form id="demo">
                <p>
                    <select
                        id="forms"
                        onChange={(event) => {
                            const { fileName } =
                                fixtures[Number(event.currentTarget.value)];

                            setParams({
                                ...params,
                                xform: fileName,
                            });
                            setFileName(fileName);
                            setError(null);
                        }}
                    >
                        <option value="" selected={params.xform === null}>
                            Choose a form…
                        </option>
                        <For each={fixtures}>
                            {(fixture, index) => (
                                <option
                                    value={index()}
                                    selected={params.xform === fixture.fileName}
                                >
                                    {fixture.fileName}
                                </option>
                            )}
                        </For>
                    </select>
                </p>

                <p id="transform-options">
                    <label>
                        <input
                            type="checkbox"
                            checked={logo()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    logo: checked,
                                });
                            }}
                        />{' '}
                        Logo
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={openclinica()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    openclinica: checked,
                                });
                            }}
                        />{' '}
                        OpenClinica
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={markdown()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    markdown: checked,
                                });
                            }}
                        />{' '}
                        Markdown
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={preprocess()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    preprocess: checked,
                                });
                            }}
                        />{' '}
                        Preprocess
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={theme()}
                            onChange={(event) => {
                                const { checked } = event.currentTarget;

                                setParams({
                                    ...params,
                                    theme: checked,
                                });
                            }}
                        />
                        Theme
                    </label>
                </p>
            </form>
            <Show when={error()} keyed>
                {(error) => (
                    <div id="error">
                        <h2>Error</h2>

                        <pre id="dump">
                            {error.message}
                            {'\n'}
                            {error.stack}
                        </pre>
                    </div>
                )}
            </Show>
            <Show when={transformed()} keyed>
                {({ form, model, ...rest }) => (
                    <div id="result">
                        <div id="metrics">
                            Time to transform: {duration()?.toFixed(2)} ms
                        </div>

                        <details>
                            <summary>XForm</summary>
                            <pre id="xform">{xform()}</pre>
                        </details>

                        <div id="form-rendered" innerHTML={form} />
                        <details>
                            <summary>Form HTML</summary>
                            <pre id="form-source">{form}</pre>
                        </details>

                        <h3>Model</h3>
                        <pre id="model">{model}</pre>

                        <h3>Data</h3>
                        <pre id="data">{JSON.stringify(rest, null, 4)}</pre>
                    </div>
                )}
            </Show>
        </>
    );
}

render(
    () => (
        <Router>
            <Routes>
                <Route path="/" component={Demo} />
                <Route path="/*" component={Demo} />
            </Routes>
        </Router>
    ),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById('app')!
);
