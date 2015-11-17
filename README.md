Enketo Transformer 
=================

[![npm version](https://badge.fury.io/js/enketo-transformer.svg)](http://badge.fury.io/js/enketo-transformer) [![Build Status](https://travis-ci.org/enketo/enketo-transformer.svg?branch=master)](https://travis-ci.org/enketo/enketo-transformer) [![Dependency Status](https://david-dm.org/enketo/enketo-transformer.svg)](https://david-dm.org/enketo/enketo-transformer)

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands. It works both as a library module, as well as a standalone app.

## Prerequisites

1. nodeJS and npm (only tested on Ubuntu 14.04, on older distros the GCC compiler may not be recent enough)

## Install as module

```bash
npm install enketo-transformer --save
```

## Use as module

```js
var transformer = require('enketo-transformer');
var xform = fs.readFileSync( 'path/to/xform.xml' );
  
var result = transformer.transform( {
	// required string of XForm
    xform: xform,
    // optional string, to add theme if no theme is defined in the XForm
    theme: 'sometheme', 
    // optional map, to replace jr://..../myfile.png URLs
    media: {
    	'myfile.png' : '/path/to/somefile.png',
    	'myfile.mp3' : '/another/path/to/2.mp3'
	}
} );
```

## Install as app (web API)
1. clone repo
2. install dependencies with `npm install`

## Use as app (web API)

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

## Response format

```json
{
	"form" : "<form>.....</form>",
	"model": "<model>...</model>"
}
	
```

## Test

* install mocha 
* run tests with `npm test`

## Develop
 
A vagrant configuration file and provisioning script is included. Use DEBUG environment variable to see debug terminal output, e.g.:

```bash
DEBUG=api,transformer,markdown node app.js
```

## Change Log

See [change log](./CHANGELOG.md)
