Enketo Transformer [![Build Status](https://travis-ci.org/enketo/enketo-transformer.svg?branch=master)](https://travis-ci.org/enketo/enketo-transformer) [![Dependency Status](https://david-dm.org/enketo/enketo-transformer.svg)](https://david-dm.org/enketo/enketo-transformer)
=================

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands.

## Prerequisites

Node v0.10.x is required. There is an [outstanding issue with Node v0.12.x](https://github.com/bsuh/node_xslt/issues/24).


## Install

1. Install libxslt and libxml2 with `(sudo) apt-get install libxml2-dev libxslt1-dev`
2. Install this library with `npm install enketo-transformer --save`


## Use

```
var transformer = require('enketo-transformer');
var xform = fs.readFileSync( 'path/to/xform.xml' );
  
var result = transformer.transform( {
    xform: xform
} );
```


## Test

* install mocha 
* run tests with `npm test`
