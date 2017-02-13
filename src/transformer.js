'use strict';

var Promise = require( 'lie' );
var fs = require( 'fs' );
var pkg = require( '../package' );
var crypto = require( 'crypto' );
var libxslt = require( 'libxslt' );
var libxmljs = libxslt.libxmljs;
var language = require( './language' );
var markdown = require( './markdown' );
var sheets = require( 'enketo-xslt' );
var NAMESPACES = {
    xmlns: 'http://www.w3.org/2002/xforms',
    orx: 'http://openrosa.org/xforms',
    h: 'http://www.w3.org/1999/xhtml'
};
var version = _getVersion();

/**
 * Performs XSLT transformation on XForm and process the result.
 *
 * @param  {{xform: string, theme: string}} survey Survey object with at least an xform property
 * @return {Promise}     promise
 */
function transform( survey ) {
    var xformDoc;

    return _parseXml( survey.xform )
        .then( function( doc ) {
            if ( typeof survey.preprocess === 'function' ) {
                doc = survey.preprocess.call( libxmljs, doc );
            }
            return doc;
        } )
        .then( function( doc ) {
            xformDoc = doc;

            return _transform( sheets.xslForm, xformDoc );
        } )
        .then( function( htmlDoc ) {
            htmlDoc = _replaceTheme( htmlDoc, survey.theme );
            htmlDoc = _replaceMediaSources( htmlDoc, survey.media );
            htmlDoc = _replaceLanguageTags( htmlDoc, survey );
            if ( survey.markdown !== false ) {
                survey.form = _renderMarkdown( htmlDoc );
            } else {
                survey.form = _docToString( htmlDoc );
            }

            return _transform( sheets.xslModel, xformDoc );
        } )
        .then( function( xmlDoc ) {
            xmlDoc = _replaceMediaSources( xmlDoc, survey.media );
            xmlDoc = _addInstanceIdNodeIfMissing( xmlDoc );
            survey.model = xmlDoc.root().get( '*' ).toString( false );
            survey.transformerVersion = pkg.version;

            delete survey.xform;
            delete survey.media;
            delete survey.preprocess;
            delete survey.markdown;
            return survey;
        } );
}

/**
 * Performs a generic XSLT transformation
 * 
 * @param  {[type]} xslDoc libxmljs object of XSL stylesheet
 * @param  {[type]} xmlDoc libxmljs object of XML document
 * @return {Promise}       libxmljs result document object 
 */
function _transform( xslStr, xmlDoc ) {
    return new Promise( function( resolve, reject ) {
        libxslt.parse( xslStr, function( error, stylesheet ) {
            if ( error ) {
                reject( error );
            } else {
                stylesheet.apply( xmlDoc, function( error, result ) {
                    if ( error ) {
                        reject( error );
                    } else {
                        resolve( result );
                    }
                } );
            }
        } );
    } );
}

/**
 * Parses and XML string into a libxmljs object
 * 
 * @param  {string} xmlStr XML string
 * @return {Promise}       libxmljs result document object
 */
function _parseXml( xmlStr ) {
    var doc;

    return new Promise( function( resolve, reject ) {
        try {
            doc = libxmljs.parseXml( xmlStr );
            resolve( doc );
        } catch ( e ) {
            reject( e );
        }
    } );
}

/**
 * Replaces the form-defined theme
 * 
 * @param  {[type]} doc   libxmljs object
 * @param  {string} theme theme
 * @return {[type]}       libxmljs object
 */
function _replaceTheme( doc, theme ) {
    var formClassAttr, formClassValue,
        HAS_THEME = /(theme-)[^"'\s]+/;

    if ( !theme ) {
        return doc;
    }

    formClassAttr = doc.root().get( '/root/form' ).attr( 'class' );
    formClassValue = formClassAttr.value();

    if ( HAS_THEME.test( formClassValue ) ) {
        formClassAttr.value( formClassValue.replace( HAS_THEME, '$1' + theme ) );
    } else {
        formClassAttr.value( formClassValue + ' ' + 'theme-' + theme );
    }

    return doc;
}

/**
 * Replaces xformManifest urls with URLs according to an internal Enketo Express url format
 * 
 * @param  {[type]} xmlDoc   libxmljs object
 * @param  {*} manifest      json representation of XForm manifest
 * @return {Promise}         libxmljs object
 */
function _replaceMediaSources( xmlDoc, mediaMap ) {
    var formLogo;
    var formLogoEl;

    if ( !mediaMap ) {
        return xmlDoc;
    }

    // iterate through each element with a src attribute
    xmlDoc.find( '//*[@src] | //a[@href]' ).forEach( function( mediaEl ) {
        var attribute = ( mediaEl.name().toLowerCase() === 'a' ) ? 'href' : 'src';
        var src = mediaEl.attr( attribute ).value();
        var matches = src ? src.match( /jr:\/\/[\w-]+\/(.+)/ ) : null;
        var filename = matches && matches.length ? matches[ 1 ] : null;
        var replacement = filename ? mediaMap[ filename ] : null;
        if ( replacement ) {
            mediaEl.attr( attribute, replacement );
        }
    } );

    // add form logo <img> element if applicable
    formLogo = mediaMap[ 'form_logo.png' ];
    formLogoEl = xmlDoc.get( '//*[@class="form-logo"]' );
    if ( formLogo && formLogoEl ) {
        formLogoEl
            .node( 'img' )
            .attr( 'src', formLogo )
            .attr( 'alt', 'form logo' );
    }

    return xmlDoc;
}

/**
 * Replaces all lang attributes to the valid IANA tag if found.
 * Also add the dir attribute to the languages in the language selector.
 *
 * @see  http://www.w3.org/International/questions/qa-choosing-language-tags
 * 
 * @param  {[type]} doc libxmljs object
 * @return {[type]}     libxmljs object
 */
function _replaceLanguageTags( doc, survey ) {
    var languageElements;
    var languages;
    var langSelectorElement;
    var defaultLang;
    var map = {};

    languageElements = doc.find( '/root/form/select[@id="form-languages"]/option' );

    // List of parsed language objects
    languages = languageElements.map( function( el ) {
        var lang = el.text();
        return language.parse( lang, _getLanguageSampleText( doc, lang ) );
    } );

    // forms without itext and only one language, still need directionality info
    if ( languages.length === 0 ) {
        languages.push( language.parse( '', _getLanguageSampleText( doc, '' ) ) );
    }

    // add or correct dir and value attributes, and amend textcontent of options in language selector
    languageElements.forEach( function( el, index ) {
        var val = el.attr( 'value' ).value();
        if ( val && val !== languages[ index ].tag ) {
            map[ val ] = languages[ index ].tag;
        }
        el.attr( {
            'data-dir': languages[ index ].dir,
            'value': languages[ index ].tag
        } ).text( languages[ index ].desc );
    } );

    // correct lang attributes
    languages.forEach( function( lang ) {
        if ( lang.src === lang.tag ) {
            return;
        }
        doc.find( '/root/form//*[@lang="' + lang.src + '"]' ).forEach( function( el ) {
            el.attr( {
                lang: lang.tag
            } );
        } );
    } );

    // correct default lang attribute
    langSelectorElement = doc.get( '/root/form/*[@data-default-lang]' );
    if ( langSelectorElement ) {
        defaultLang = langSelectorElement.attr( 'data-default-lang' ).value();
        languages.some( function( lang ) {
            if ( lang.src === defaultLang ) {
                langSelectorElement.attr( {
                    'data-default-lang': lang.tag
                } );
                return true;
            }
            return false;
        } );
    }

    survey.languageMap = map;
    return doc;
}

/**
 * Obtains a non-empty hint text or other text sample of a particular form language.
 * 
 * @param  {[type]} doc  libxmljs object
 * @param  {string} lang language
 * @return {string}      the text sample
 */
function _getLanguageSampleText( doc, lang ) {
    // First find non-empty text content of a hint with that lang attribute.
    // If not found, find any span with that lang attribute.
    var langSampleEl = doc.get( '/root/form//span[contains(@class, "or-hint") and @lang="' + lang + '" and normalize-space()]' ) ||
        doc.get( '/root/form//span[@lang="' + lang + '" and normalize-space()]' );

    return ( langSampleEl && langSampleEl.text().trim().length ) ? langSampleEl.text() : 'nothing';
}

/**
 * Temporary function to add a /meta/instanceID node if this is missing. 
 * This used to be done in enketo-xslt but was removed when support for namespaces was added.
 * 
 * @param {[type]} doc libxmljs object
 */
function _addInstanceIdNodeIfMissing( doc ) {
    var xformsPath = '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta/xmlns:instanceID';
    var openrosaPath = '/xmlns:root/xmlns:model/xmlns:instance/*/orx:meta/orx:instanceID';
    var instanceIdEl = doc.get( xformsPath + ' | ' + openrosaPath, NAMESPACES );

    if ( !instanceIdEl ) {
        var rootEl = doc.get( '/xmlns:root/xmlns:model/xmlns:instance/*', NAMESPACES );
        var metaEl = doc.get( '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta', NAMESPACES );

        if ( metaEl ) {
            metaEl
                .node( 'instanceID' );
        } else if ( rootEl ) {
            rootEl
                .node( 'meta' )
                .node( 'instanceID' );
        }
    }

    return doc;
}

/**
 * Converts a subset of Markdown in all textnode children of labels and hints into HTML
 * 
 * @param  {[type]} htmlDoc libxmljs object
 * @return {[type]}     libxmljs object
 */
function _renderMarkdown( htmlDoc ) {
    var htmlStr;
    var replacements = {};

    // First turn all outputs into text so *<span class="or-output></span>* can be detected
    htmlDoc.find( '/root/form//span[contains(@class, "or-output")]' ).forEach( function( el, index ) {
        var key = '---output-' + index;
        var textNode = el.childNodes()[ 0 ].clone();
        replacements[ key ] = el.toString();
        textNode.text( key );
        el.replace( textNode );
        // Note that we end up in a situation where we likely have sibling text nodes...
    } );

    // Now render markdown
    htmlDoc.find( '/root/form//span[contains(@class, "question-label") or contains(@class, "or-hint")]' ).forEach( function( el, index ) {
        var key;
        /**
         * Using text() is done because:
         * a) We are certain that these <span>s do not contain other elements, other than formatting/markdown <span>s.
         * b) This avoids the need to merge any sibling text nodes that could have been created in the previous step.
         *
         * Note that text() will convert &gt; to >
         */
        var original = el.text().replace( '<', '&lt;' ).replace( '>', '&gt;' );
        var rendered = markdown.toHtml( original );
        if ( original !== rendered ) {
            key = '$$$' + index;
            replacements[ key ] = rendered;
            el.text( key );
        }
    } );

    // TODO: does this result in self-closing tags?
    htmlStr = _docToString( htmlDoc );

    // Now replace the placeholders with the rendered HTML
    // in reverse order so outputs are done last
    Object.keys( replacements ).reverse().forEach( function( key ) {
        var replacement = replacements[ key ];
        if ( replacement ) {
            htmlStr = htmlStr.replace( key, replacement );
        }
    } );

    return htmlStr;
}

function _textNodesOnly( node ) {
    return node.type() === 'text';
}

function _docToString( doc ) {
    // TODO: does this result in self-closing tags?
    return doc.root().get( '*' ).toString( false );
}

/**
 * gets a hash of the 2 XSL stylesheets
 * @return {string} hash representing version of XSL stylesheets
 */
function _getVersion() {
    return _md5( sheets.xslForm + sheets.xslModel + pkg.version );
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
    version: version,
    NAMESPACES: NAMESPACES
};
