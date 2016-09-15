'use strict';

/** 
 * This is not a robust, secure web API. It is just a quick starting point.
 * This is repo is not used in production as a web API (only as a library).
 *
 * See inventory of work to be done here: https://github.com/enketo/enketo-transformer/labels/web-api-only.
 * 
 * PRs are very welcome!
 */

var Promise = require( 'lie' );
var request = require( 'request' );
var express = require( 'express' );
var router = express.Router();
var transformer = require( './transformer' );

router
    .get( '/', function( req, res ) {
        // NOTE: req.query.xform is a URL
        if ( req.app.get( 'secure' ) ) {
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
                .then( function( xform ) {
                    return transformer.transform( {
                        xform: xform,
                        theme: req.query.theme,
                        markdown: req.query.markdown !== 'false'
                    } );
                } )
                .then( function( result ) {
                    res.json( result );
                } )
                .catch( function( error ) {
                    error.status = error.status || 500;
                    error.message = error.message || 'Unknown error.';
                    res.status( error.status ).send( error.message + ' (stack: ' + error.stack + ')' );
                } );
        }
    } )
    .post( '/', function( req, res ) {
        // NOTE: req.query.xform is an XML string
        if ( req.app.get( 'secure' ) ) {
            res.status( 405 ).send( 'Not Allowed' );
        } else if ( !req.body.xform ) {
            res.status( 400 ).send( 'Bad Request.' );
        } else {
            // allow requests from anywhere
            res.set( 'Access-Control-Allow-Origin', '*' );

            transformer.transform( {
                    xform: req.body.xform,
                    theme: req.body.theme,
                    media: req.body.media,
                    markdown: req.body.markdown !== 'false'
                } )
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

/**
 * Sends a request to an OpenRosa server. Only for basic retrieval of 
 * public forms that do not require authentication.
 *
 * @param  { {url: string, method: string} } options  request options object
 * @return { Promise }
 */
function _request( options ) {
    var method;
    var error;

    options.headers = options.headers || {};
    options.headers[ 'X-OpenRosa-Version' ] = '1.0';

    method = options.method || 'get';

    return new Promise( function( resolve, reject ) {
        request[ method ]( options, function( error, response, body ) {
            if ( error ) {
                console.log( 'Error occurred when requesting ' + options.url, error );
                reject( error );
            } else if ( response.statusCode === 401 ) {
                error = new Error( 'Forbidden. Authorization Required.' );
                error.status = response.statusCode;
                reject( error );
            } else if ( response.statusCode < 200 || response.statusCode >= 300 ) {
                error = new Error( 'Request to ' + options.url + ' failed.' );
                error.status = response.statusCode;
                reject( error );
            } else {
                console.log( 'response of request to ' + options.url + ' has status code: ', response.statusCode );
                resolve( body );
            }
        } );
    } );
}

module.exports = function( app ) {
    app.use( '/transform', router );
};
