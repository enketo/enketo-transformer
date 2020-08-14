const express = require( 'express' );
const app = express();
const bodyParser = require( 'body-parser' );
const config = require( './config/config.json' );

for ( const item in config ) {
    app.set( item, config[ item ] );
}

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( {
    extended: true
} ) );

require( './src/api' )( app );

app.listen( app.get( 'port' ), () => {
    console.warn( `enketo-transformer running on port ${app.get( 'port' )}!` );
} );
