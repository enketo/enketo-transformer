[![npm version](https://badge.fury.io/js/enketo-transformer.svg)](http://badge.fury.io/js/enketo-transformer) [![Build Status](https://travis-ci.org/enketo/enketo-transformer.svg?branch=master)](https://travis-ci.org/enketo/enketo-transformer) [![Dependency Status](https://david-dm.org/enketo/enketo-transformer.svg)](https://david-dm.org/enketo/enketo-transformer)

Enketo Transformer
=================

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands. It works both as a library module, as well as a standalone app.

### Prerequisites

1. nodeJS 8 and npm

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

### Develop

The script `npm run develop` runs the app on port 8085 and also serves test/forms on port 8081. You could test the transformation output by placing an XForm in test/forms and running
http://localhost:8085/transform?xform=http://localhost:8081/autocomplete.xml

A vagrant configuration file and provisioning script is also included. Use DEBUG environment variable to see debug terminal output, e.g.:

```bash
DEBUG=api,transformer,markdown,language node app.js
```

### License

See [license document](https://github.com/enketo/enketo-validate/blob/master/LICENSE). Also note the additional 'powered by enketo' [footer requirement of enketo-xslt](https://github.com/enketo/enketo-xslt#license) which is used in this repository and therefore applicable.

### Change Log

See [change log](https://github.com/enketo/enketo-transformer/blob/master/CHANGELOG.md)
