![coverage-shield-badge-1](https://img.shields.io/badge/coverage-98.1%25-brightgreen.svg)
[![npm version](https://badge.fury.io/js/enketo-transformer.svg)](http://badge.fury.io/js/enketo-transformer) [![Build Status](https://travis-ci.org/enketo/enketo-transformer.svg?branch=master)](https://travis-ci.org/enketo/enketo-transformer) [![Dependency Status](https://david-dm.org/enketo/enketo-transformer.svg)](https://david-dm.org/enketo/enketo-transformer)

Enketo Transformer
=================

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands. It works both as a library module, as well as a standalone app.

[Technical Documentation](https://enketo.github.io/enketo-transformer/)

### Prerequisites

1. Node.js 16 and npm 6 (Node.js 14 is also supported)

### Install as module

```bash
npm install enketo-transformer --save
```

### Use as module

```js
const transformer = require('enketo-transformer');
const xform = fs.readFileSync( 'path/to/xform.xml' );

transformer.transform( {
    // required string of XForm
    xform: xform,
    // optional string, to add theme if no theme is defined in the XForm
    theme: 'sometheme',
    // optional map, to replace jr://..../myfile.png URLs
    media: {
        'myfile.png' : '/path/to/somefile.png',
        'myfile.mp3' : '/another/path/to/2.mp3'
    },
    // optional ability to disable markdown rendering (default is true)
    markdown: false,
    // optional preprocess function that transforms the XForm (as libXMLJs object) to
    // e.g. correct incompatible XForm syntax before Enketo's transformation takes place
    preprocess: doc => doc,
} ).then(function( result ){
    // do something with result
});
```

### Install as app (web API)

1. clone repo
2. install dependencies with `npm install`

### Use as app (web API)

1. start with `npm start`
2. limited use with `GET /transform` with xform parameter (required, **xform URL**), or
3. full-featured use with: `POST /transform` with URL-encoded body including `xform` (required, **full XForm as a string**), `theme` (optional, string), and `media` (optional, map) parameters

sample GET request:
```
curl http://localhost:8085/transform?xform=https://example.com/forms/78372/form.xml
```

sample POST request:
```bash
curl -d "xform=<xform>x</xform>&theme=plain&media[myfile.png]=/path/to/somefile.png&media[this]=that" http://localhost:8085/transform
```

### Response format

```json
{
    "form" : "<form>.....</form>",
    "model": "<model>...</model>",
    "transformerVersion": "1.13.0",
    "languageMap": { "Français": "fr", "English": "en" }
}

```

### Test

* run tests with `npm test`
* run tests in watch mode with `npm run test:watch`
* Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with `npm run test-watch`, and support for debugging in [VSCode](https://code.visualstudio.com/) is provided. For instructions see [./#debugging-test-watch-mode-in-vscode](Debugging test watch mode in VSCode) below

#### Debugging test watch mode in VSCode

Basic usage:

1. Go to VSCode's "Run and Debug" panel
2. Select "Test (watch + debug)"
3. Click the play button

Optionally, you can add a keyboard shortcut to select launch tasks:

1. Open the keyboard shortcuts settings (cmd+k cmd+s on Mac, ctrl+k ctrl+s on other OSes)
2. Search for `workbench.action.debug.selectandstart`
3. Click the + button to add your preferred keybinding keybinding

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

Releases are done each time a dependent tool needs an `enketo-transformer` change. They are published by [@Martijnr](https://github.com/MartijnR) and require the following steps:
  - update [change log](https://github.com/enketo/enketo-transformer/blob/master/CHANGELOG.md)
  - update version in `package.json`
  - check [Dependabot alerts](https://github.com/enketo/enketo-transformer/security/dependabot) for vulnerabilities
  - update dependencies (`npm update` and then check if `node-libxslt` has been updated because it has caused problems in the past).
  - `npm audit fix`
  - `npm run build-docs`
  - tag the release with the version
  - publish with `npm publish`

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
