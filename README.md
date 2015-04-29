Enketo Transformer [![Build Status](https://travis-ci.org/enketo/enketo-transformer.svg?branch=master)](https://travis-ci.org/enketo/enketo-transformer) [![Dependency Status](https://david-dm.org/enketo/enketo-transformer.svg)](https://david-dm.org/enketo/enketo-transformer)
=================

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands. It works both as a library module, as well as a standalone app.

## Prerequisites

1. Node v0.10.x is required. There is an [outstanding issue with Node v0.12.x](https://github.com/bsuh/node_xslt/issues/24).
2. Install libxslt and libxml2 with `(sudo) apt-get install libxml2-dev libxslt1-dev`

## Install as module

```bash
npm install enketo-transformer --save
```

## Use as module

```js
var transformer = require('enketo-transformer');
var xform = fs.readFileSync( 'path/to/xform.xml' );
  
var result = transformer.transform( {
    xform: xform
} );
```

## Install as app
1. clone repo
2. install dependencies with `npm install`

## Use as app

1. start with `npm start`
2. use with queryparameter e.g. with http://localhost:8085/transformer?xform=http://myxforms.com/myxform.xml


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
