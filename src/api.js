/**
 * @module api
 *
 * @description This is not a robust, secure web API. It is just a quick starting point.
 * This is repo is not used in production as a web API (only as a library).
 *
 * See inventory of work to be done here: https://github.com/enketo/enketo-transformer/labels/web-api-only.
 *
 * PRs are very welcome!
 */

const request = require( 'request' );
const express = require( 'express' );
const router = express.Router();
const transformer = require( './transformer' );

router
    .all( '/', ( req, res, next ) => {
        if ( req.app.get( 'secure' ) ) {
            res.status( 405 ).send( 'Not Allowed' );
        } else if ( !req.query.xform ) {
            res.status( 400 ).send( 'Bad Request.' );
        } else {
            // allow requests from anywhere
            res.set( 'Access-Control-Allow-Origin', '*' );
            next();
        }
    } )
    .get( '/', ( req, res ) => {
        _request( {
            method: 'get',
            url: req.query.xform
        } )
            .then( xform => transformer.transform( {
                xform,
                theme: req.query.theme,
                openclinica: req.query.openclinica === 'true',
                markdown: req.query.markdown !== 'false'
            } ) )
            .then( result => {
                res.json( result );
            } )
            .catch( error => {
                error.status = error.status || 500;
                error.message = error.message || 'Unknown error.';
                res.status( error.status ).send( `${error.message} (stack: ${error.stack})` );
            } );
    } )
    .post( '/', ( req, res ) => {
        transformer.transform( {
            xform: req.body.xform,
            theme: req.body.theme,
            media: req.body.media,
            openclinica: req.body.openclinica === 'true',
            markdown: req.body.markdown !== 'false'
        } )
            .then( result => {
                res.json( result );
            } )
            .catch( error => {
                error.status = error.status || 500;
                error.message = error.message || 'Unknown error.';
                res.status( error.status ).send( `${error.message} (stack: ${error.stack})` );
            } );
    } )
    // for development purposes, to return HTML that can be easily inspected in the developer console
    .get( '/htmlform', ( req, res ) => {
        _request( {
            method: 'get',
            url: req.query.xform
        } )
            .then( xform => transformer.transform( {
                xform,
                theme: req.query.theme,
                openclinica: req.query.openclinica === 'true',
                markdown: req.query.markdown !== 'false'
            } ) )
            .then( result => {
                res.send( result.form );
            } )
            .catch( error => {
                error.status = error.status || 500;
                error.message = error.message || 'Unknown error.';
                res.status( error.status ).send( `${error.message} (stack: ${error.stack})` );
            } );
    } );

/**
 * Sends a request to an OpenRosa server. Only for basic retrieval of
 * public forms that do not require authentication.
 *
 * @param { {url: string, method: string} } options - Request options object.
 * @return { Promise<Error|object> } a promise that resolves in request body.
 */
function _request( options ) {
    options.headers = options.headers || {};
    options.headers[ 'X-OpenRosa-Version' ] = '1.0';

    const method = options.method || 'get';

    return new Promise( ( resolve, reject ) => {
        request[ method ]( options, ( error, response, body ) => {
            if ( error ) {
                console.error( `Error occurred when requesting ${options.url}`, error );
                reject( error );
            } else if ( response.statusCode === 401 ) {
                const error = new Error( 'Forbidden. Authorization Required.' );
                error.status = response.statusCode;
                reject( error );
            } else if ( response.statusCode < 200 || response.statusCode >= 300 ) {
                const error = new Error( `Request to ${options.url} failed.` );
                error.status = response.statusCode;
                reject( error );
            } else {
                //console.log( `response of request to ${options.url} has status code: `, response.statusCode );
                resolve( body );
            }
        } );
    } );
}

module.exports = app => {
    app.use( '/transform', router );
};
