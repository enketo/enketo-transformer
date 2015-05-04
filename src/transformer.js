/* global setTimeout */
"use strict";

var version,
    Q = require( 'q' ),
    fs = require( 'fs' ),
    crypto = require( 'crypto' ),
    transformer = require( 'node_xslt' ),
    libxmljs = require( "libxmljs" ),
    sheets = require( 'enketo-xslt' ),
    debug = require( 'debug' )( 'transformer' );

_setVersion();

/**
 * Performs XSLT transformation on XForm asynchronously.
 *
 * @param  {{xform: string, theme: string}} survey Survey object with at least an xform property
 * @return {Promise}     promise
 */
function transform( survey ) {
    var error, errorMsg, doc, formStylesheet, instanceStylesheet, xsltEndTime,
        deferred = Q.defer(),
        startTime = new Date().getTime();

    // make this asynchronous, sort of
    setTimeout( function() {
        try {
            doc = transformer.readXmlString( survey.xform );

            formStylesheet = transformer.readXsltString( sheets.xslForm );
            survey.form = _stripRoot( transformer.transform( formStylesheet, doc, [ 'wtf', 'why' ] ) );

            instanceStylesheet = transformer.readXsltString( sheets.xslModel );
            survey.model = _stripRoot( transformer.transform( instanceStylesheet, doc, [ 'wtf', 'why' ] ) );

            xsltEndTime = new Date().getTime();
            debug( 'form and instance XSLT transformation took ' + ( xsltEndTime - startTime ) / 1000 + ' seconds' );

            survey.form = _replaceTheme( survey.form, survey.theme );

            survey.form = _replaceMediaSources( survey.form, survey.manifest );
            survey.model = _replaceMediaSources( survey.model, survey.manifest );
            debug( 'post-processing transformation result took ' + ( new Date().getTime() - xsltEndTime ) / 1000 + ' seconds' );

            delete survey.xform;

            deferred.resolve( survey );
        } catch ( e ) {
            error = ( e ) ? new Error( e ) : new Error( 'unknown transformation error' );
            debug( 'error during xslt transformation', error );
            deferred.reject( error );
        }
    }, 0 );

    return deferred.promise;
}

function _stripRoot( xml ) {
    var xmlDoc = libxmljs.parseXml( xml );
    return xmlDoc.root().get( '*' ).toString( false );
}

function _replaceTheme( xml, theme ) {
    var doc, formClassAttr, formClassValue,
        HAS_THEME = /(theme-)(.*)["'\s]/;

    if ( !theme ) {
        return xml;
    }

    doc = libxmljs.parseXml( xml );
    formClassAttr = doc.root().get( '/form' ).attr( 'class' );
    formClassValue = formClassAttr.value();

    if ( HAS_THEME.test( formClassValue ) ) {
        formClassAttr.value( formClassValue.replace( HAS_THEME, '$1' + theme ) );
    } else {
        formClassAttr.value( formClassValue + ' ' + 'theme-' + theme );
    }

    // TODO: probably result in selfclosing tags for empty elements where not allowed in HTML. Check this.
    return doc.toString();
}

function _replaceMediaSources( xmlStr, manifest ) {
    var doc;

    if ( !manifest ) {
        return xmlStr;
    }

    doc = libxmljs.parseXml( xmlStr );

    // iterate through each element with a src attribute
    doc.find( '//*[@src]' ).forEach( function( mediaEl ) {
        manifest.some( function( file ) {
            if ( new RegExp( 'jr://(images|video|audio|file|file-csv)/' + file.filename ).test( mediaEl.attr( 'src' ).value() ) ) {
                mediaEl.attr( 'src', _toLocalMediaUrl( file.downloadUrl ) );
                return true;
            }
            return false;
        } );
    } );

    // add form logo if existing in manifest
    manifest.some( function( file ) {
        var formLogoEl = doc.get( '//*[@class="form-logo"]' );
        if ( file.filename === 'form_logo.png' && formLogoEl ) {
            formLogoEl
                .node( 'img' )
                .attr( 'src', _toLocalMediaUrl( file.downloadUrl ) )
                .attr( 'alt', 'form logo' );
            return true;
        }
    } );

    // TODO: probably result in selfclosing tags for empty elements where not allowed in HTML. Check this.
    return doc.toString();
}

/**
 * Converts a url to a local (Enketo Express) url.
 * If required we could make the url prefix dynamic by exporting a function that takes a prefix parameter.
 *
 * @param  {string} url The url to convert.
 * @return {string}     The converted url.
 */
function _toLocalMediaUrl( url ) {
    var localUrl = '/media/get/' + url.replace( /(https?):\/\//, '$1/' );

    return localUrl;
}

/**
 * gets a hash of the 2 XSL stylesheets
 * @return {string} hash representing version of XSL stylesheets - NOT A PROMISE
 */
function _setVersion() {
    // only perform this expensive check once after (re)starting application
    if ( !version ) {
        version = _md5( sheets.xslForm + sheets.xslModel );
    }
}

/**
 * Calculate the md5 hash of a message.
 *
 * @param  {string|Buffer} message The string or buffer
 * @return {string}         The hash
 */
function _md5( message ) {
    var hash = crypto.createHash( 'md5' );
    hash.update( message );
    return hash.digest( 'hex' );
}

module.exports = {
    transform: transform,
    version: version
};
