Enketo Transformer [![Build Status](https://travis-ci.org/enketo/enketo-transformer.svg?branch=master)](https://travis-ci.org/enketo/enketo-transformer) [![Dependency Status](https://david-dm.org/enketo/enketo-transformer.svg)](https://david-dm.org/enketo/enketo-transformer)
=================

NodeJS library that transforms OpenRosa/ODK XForms into a format the Enketo understands.

## Install

```
npm install enketo-transformer --save
```


## Use

```
var transformer = require('enketo-transformer');
var xform = fs.readFileSync( 'path/to/xform.xml' );
  
var htmlForm = transformer.transform( {
    xform: xform
} );
```


## Test

* install mocha 
* run tests with `npm test`
