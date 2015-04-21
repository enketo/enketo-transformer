var express = require( 'express' ),
    app = express(),
    Q = require( 'q' ),
    request = require( 'request' ),
    transformer = require( './src/transformer' ),
    debug = require( 'debug' )( 'app.js' ),
    config = require( './config/config.json' );

for ( var item in config ) {
    app.set( item, config[ item ] );
}

app.get( '/transform', function( req, res ) {
    if ( app.get( 'secure' ) ) {
        res.status( 405 ).send( 'Not Allowed' );
    } else if ( !req.query.xform ) {
        res.status( 400 ).send( 'Bad Request.' );
    } else {
        // allow requests from anywhere
        res.set( 'Access-Control-Allow-Origin', '*' );

        _request( {
                method: 'get',
                url: req.query.xform
            } )
            .then( transformer.transform )
            .then( function( result ) {
                res.json( result );
            } )
            .catch( function( error ) {
                error.status = error.status || 500;
                error.message = error.message || 'Unknown error.';
                res.status( error.status ).send( error.message + ' (stack: ' + error.stack + ')' );
            } );
    }
} );

app.listen( app.get( 'port' ), function() {
    console.log( 'app running on port ' + app.get( 'port' ) + '!' );
} );

/**
 * Sends a request to an OpenRosa server
 *
 * @param  { {url: string, method: string} } options  request options object
 * @return { Promise }
 */
function _request( options ) {
    var error,
        deferred = Q.defer();

    // set headers
    options.headers = options.headers || {};
    options.headers[ 'X-OpenRosa-Version' ] = '1.0';

    var method = options.method || 'get';

    request[ method ]( options, function( error, response, body ) {
        if ( error ) {
            debug( 'Error occurred when requesting ' + options.url, error );
            deferred.reject( error );
        } else if ( response.statusCode === 401 ) {
            error = new Error( 'Forbidden. Authorization Required.' );
            error.status = response.statusCode;
            deferred.reject( error );
        } else if ( response.statusCode < 200 || response.statusCode >= 300 ) {
            error = new Error( 'Request to ' + options.url + ' failed.' );
            error.status = response.statusCode;
            deferred.reject( error );
        } else {
            debug( 'response of request to ' + options.url + ' has status code: ', response.statusCode );
            deferred.resolve( {
                xform: body
            } );
        }
    } );

    return deferred.promise;
}
