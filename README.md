![coverage-shield-badge-1](https://img.shields.io/badge/coverage-97.86%25-brightgreen.svg)
[![npm version](https://badge.fury.io/js/enketo-transformer.svg)](http://badge.fury.io/js/enketo-transformer)

# Enketo Transformer

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands. It works both as a library module, as well as a standalone app.

### Prerequisites

1. Volta (optional, but recommended)
1. Node.js 16 and npm 6 (Node.js 14 is also supported)

### Install as module

```bash
npm install enketo-transformer --save
```

### Use as module

#### Node

```ts
import { transform } from 'enketo-transformer';

const xform = fs.readFileSync('path/to/xform.xml');
const result = await transform({
    // required string of XForm
    xform: xform,

    // optional string, to add theme if no theme is defined in the XForm
    theme: 'sometheme',

    // optional map, to replace jr://..../myfile.png URLs
    media: {
        'myfile.png': '/path/to/somefile.png',
        'myfile.mp3': '/another/path/to/2.mp3',
    },

    // optional ability to disable markdown rendering (default is true)
    markdown: false,

    // optional preprocess function that transforms the XForm (as libXMLJs object) to
    // e.g. correct incompatible XForm syntax before Enketo's transformation takes place
    preprocess: (doc) => doc,
});

// ... do something with result
```

#### Web

Enketo Transformer may also be used on the web as an ESM module. It is exported in releases as `enketo-transformer/web`. There's one minor API difference, `preprocess` is named `preprocessXForm`, which accepts and may return a string, i.e.:

```ts
import { transform } from 'enketo-transformer/web';

const xformResponse = await fetch('https://url/to/xform.xml');
const xform = await xformResponse.text();
const result = await transform({
    xform,
    preprocessXForm: (doc) => doc,
    // ...
});
```

### Development/local usage

#### Install

```sh
npm install
```

#### Interactive web demo

Enketo Transformer provides a simple web demo which allows you to select any of the XForms used as fixtures in its test suites to view their transformed output, as well as toggling several of the available transform options to see how they affect the transform. To run the demo:

```sh
cd ./demo
npm install
npm run demo
```

This will print out the demo URL (typically `http://localhost:3000`, unless that port is already in use).

#### Test/dev server

Enketo Transformer provides a simple server API. It may be used for testing locally, but isn't a robust or secure server implementation so it should not be used in production. You can start it in a local dev environment by running:

```sh
npm start
```

It provides two endpoints:

-   limited use with `GET /transform` with xform parameter (required, **xform URL**), or
-   full-featured use with: `POST /transform` with URL-encoded body including `xform` (required, **full XForm as a string**), `theme` (optional, string), and `media` (optional, map) parameters

sample GET request:

```
curl http://localhost:8085/transform?xform=https://example.com/forms/78372/form.xml
```

sample POST request:

```bash
curl -d "xform=<xform>x</xform>&theme=plain&media[myfile.png]=/path/to/somefile.png&media[this]=that" http://localhost:8085/transform
```

##### Response format

```json
{
    "form": "<form>.....</form>",
    "model": "<model>...</model>",
    "transformerVersion": "1.13.0",
    "languageMap": { "Français": "fr", "English": "en" }
}
```

#### Test

-   run tests with `npm test`
-   run tests in watch mode with `npm run test:watch`
-   Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with `npm run test-watch`, and support for debugging in [VSCode](https://code.visualstudio.com/) is provided. For instructions see [./#debugging-test-watch-mode-in-vscode](Debugging test watch mode in VSCode) below

#### Debugging test watch mode in VSCode

Basic usage:

1. Go to VSCode's "Run and Debug" panel
2. Select either "Test server (watch + debug)" or "Test client (watch + debug)"
3. Click the play button

Server tests will launch Node in debug mode directly in VSCode.

Client tests will launch `@web/test-runner` in a browser, where you can select a test suite and debug in the browser's dev tools.

Optionally, you can add a keyboard shortcut to select launch tasks:

1. Open the keyboard shortcuts settings (cmd+k cmd+s on Mac, ctrl+k ctrl+s on other OSes)
2. Search for `workbench.action.debug.selectandstart`
3. Click the + button to add your preferred keybinding

### Develop

The script `npm run develop` runs the app on port 8085 and also serves test/forms on port 8081. You could test the transformation output by placing an XForm in test/forms and running
http://localhost:8085/transform?xform=http://localhost:8081/autocomplete.xml

There is also a helpful **GET /transform/htmlform** endpoint to easily inspect the HTML form output in the developer console. Example:
http://localhost:8085/transform/htmlform?xform=http://localhost:8081/autocomplete.xml

A vagrant configuration file and provisioning script is also included. Use DEBUG environment variable to see debug terminal output, e.g.:

```bash
DEBUG=api,transformer,markdown,language node app.js
```

### Release

Releases are done each time a dependent tool needs an `enketo-transformer` change.

1. Create release PR
1. Update `CHANGELOG.md`
1. Update version in `package.json`
    - Bump to major version if downstream has to make changes.
1. Check [Dependabot](https://github.com/enketo/enketo-transformer/security/dependabot) for alerts
1. Run `npm update`
    - Check if `node-libxslt` has been updated because it has caused problems in the past
1. Run `npm audit`
    - Run `npm audit fix --production` to apply most important fixes
1. Run `npm i`
1. Run `npm test`
1. Merge PR with all changes
1. Create GitHub release
1. Tag and publish the release
    - GitHub Action will publish it to npm

### License

See [license document](./LICENSE).

In addition, any product that uses enketo-transformer or parts thereof is required to have a "Powered by Enketo" footer, according to the specifications below, on all screens in which the output of enketo-xslt, or parts thereof, are used, unless explicity exempted from this requirement by Enketo LLC in writing. Partners and sponsors of the Enketo Project, listed on [https://enketo.org/#about](https://enketo.org/#about) and on [https://github.com/enketo/enketo-core#sponsors](https://github.com/enketo/enketo-core#sponsors) are exempted from this requirements and so are contributors listed in [package.json](./package.json).

The aim of this requirement is to force adopters to give something back to the Enketo project, by at least spreading the word and thereby encouraging further adoption.

Specifications:

1. The word "Enketo" is displayed using Enketo's logo.
2. The minimum font-size of "Powered by" is 12 points.
3. The minimum height of the Enketo logo matches the font-size used.
4. The Enketo logo is hyperlinked to https://enketo.org

Example:

Powered by <a href="https://enketo.org"><img height="16" style="height: 16px;" src="https://enketo.org/media/images/logos/enketo_bare_150x56.png" /></a>

### Change Log

See [change log](https://github.com/enketo/enketo-transformer/blob/master/CHANGELOG.md)
