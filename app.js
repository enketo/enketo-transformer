'use strict';

var express = require( 'express' );
var app = express();
var bodyParser = require( 'body-parser' );
var debug = require( 'debug' )( 'app.js' );
var config = require( './config/config.json' );

for ( var item in config ) {
    app.set( item, config[ item ] );
}

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( {
    extended: true
} ) );

require( './src/api' )( app );

app.listen( app.get( 'port' ), function() {
    console.log( 'app running on port ' + app.get( 'port' ) + '!' );
} );
