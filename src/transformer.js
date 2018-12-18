const Promise = require( 'lie' );
const pkg = require( '../package' );
const crypto = require( 'crypto' );
const libxslt = require( 'libxslt' );
const libxmljs = libxslt.libxmljs;
const language = require( './language' );
const markdown = require( './markdown' );
const sheets = require( 'enketo-xslt' );
const NAMESPACES = {
    xmlns: 'http://www.w3.org/2002/xforms',
    orx: 'http://openrosa.org/xforms',
    h: 'http://www.w3.org/1999/xhtml'
};
const version = _getVersion();

/**
 * Performs XSLT transformation on XForm and process the result.
 *
 * @param  {{xform: string, theme: string}} survey Survey object with at least an xform property
 * @return {Promise}     promise
 */
function transform( survey ) {
    let xformDoc;
    const xsltParams = survey.includeRelevantMsg ? {
        'include-relevant-msg': 1
    } : {};

    return _parseXml( survey.xform )
        .then( doc => {
            if ( typeof survey.preprocess === 'function' ) {
                doc = survey.preprocess.call( libxmljs, doc );
            }
            return doc;
        } )
        .then( doc => {
            xformDoc = doc;

            return _transform( sheets.xslForm, xformDoc, xsltParams );
        } )
        .then( htmlDoc => {
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
        .then( xmlDoc => {
            xmlDoc = _replaceMediaSources( xmlDoc, survey.media );
            xmlDoc = _addInstanceIdNodeIfMissing( xmlDoc );
            survey.model = xmlDoc.root().get( '*' ).toString( false );
            survey.transformerVersion = pkg.version;

            delete survey.xform;
            delete survey.media;
            delete survey.preprocess;
            delete survey.markdown;
            delete survey.includeRelevantMsg;
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
function _transform( xslStr, xmlDoc, xsltParams ) {
    const params = xsltParams || {};
    return new Promise( ( resolve, reject ) => {
        libxslt.parse( xslStr, ( error, stylesheet ) => {
            if ( error ) {
                reject( error );
            } else {
                stylesheet.apply( xmlDoc, params, ( error, result ) => {
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
    let doc;

    return new Promise( ( resolve, reject ) => {
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
    const HAS_THEME = /(theme-)[^"'\s]+/;

    if ( !theme ) {
        return doc;
    }

    const formClassAttr = doc.root().get( '/root/form' ).attr( 'class' );
    const formClassValue = formClassAttr.value();

    if ( HAS_THEME.test( formClassValue ) ) {
        formClassAttr.value( formClassValue.replace( HAS_THEME, `$1${theme}` ) );
    } else {
        formClassAttr.value( `${formClassValue} theme-${theme}` );
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
    if ( !mediaMap ) {
        return xmlDoc;
    }

    // iterate through each element with a src attribute
    xmlDoc.find( '//*[@src] | //a[@href]' ).forEach( mediaEl => {
        const attribute = ( mediaEl.name().toLowerCase() === 'a' ) ? 'href' : 'src';
        const src = mediaEl.attr( attribute ).value();
        const matches = src ? src.match( /jr:\/\/[\w-]+\/(.+)/ ) : null;
        const filename = matches && matches.length ? matches[ 1 ] : null;
        const replacement = filename ? mediaMap[ filename ] : null;
        if ( replacement ) {
            mediaEl.attr( attribute, replacement );
        }
    } );

    // add form logo <img> element if applicable
    const formLogo = mediaMap[ 'form_logo.png' ];
    const formLogoEl = xmlDoc.get( '//*[@class="form-logo"]' );
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
    const map = {};

    const languageElements = doc.find( '/root/form/select[@id="form-languages"]/option' );

    // List of parsed language objects
    const languages = languageElements.map( el => {
        const lang = el.text();
        return language.parse( lang, _getLanguageSampleText( doc, lang ) );
    } );

    // forms without itext and only one language, still need directionality info
    if ( languages.length === 0 ) {
        languages.push( language.parse( '', _getLanguageSampleText( doc, '' ) ) );
    }

    // add or correct dir and value attributes, and amend textcontent of options in language selector
    languageElements.forEach( ( el, index ) => {
        const val = el.attr( 'value' ).value();
        if ( val && val !== languages[ index ].tag ) {
            map[ val ] = languages[ index ].tag;
        }
        el.attr( {
            'data-dir': languages[ index ].dir,
            'value': languages[ index ].tag
        } ).text( languages[ index ].desc );
    } );

    // correct lang attributes
    languages.forEach( lang => {
        if ( lang.src === lang.tag ) {
            return;
        }
        doc.find( `/root/form//*[@lang="${lang.src}"]` ).forEach( el => {
            el.attr( {
                lang: lang.tag
            } );
        } );
    } );

    // correct default lang attribute
    const langSelectorElement = doc.get( '/root/form/*[@data-default-lang]' );
    if ( langSelectorElement ) {
        const defaultLang = langSelectorElement.attr( 'data-default-lang' ).value();
        languages.some( lang => {
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
    const langSampleEl = doc.get( `/root/form//span[contains(@class, "or-hint") and @lang="${lang}" and normalize-space() and not(./text() = '-')]` ) ||
        doc.get( `/root/form//span[@lang="${lang}" and normalize-space() and not(./text() = '-')]` );

    return ( langSampleEl && langSampleEl.text().trim().length ) ? langSampleEl.text() : 'nothing';
}

/**
 * Temporary function to add a /meta/instanceID node if this is missing. 
 * This used to be done in enketo-xslt but was removed when support for namespaces was added.
 * 
 * @param {[type]} doc libxmljs object
 */
function _addInstanceIdNodeIfMissing( doc ) {
    const xformsPath = '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta/xmlns:instanceID';
    const openrosaPath = '/xmlns:root/xmlns:model/xmlns:instance/*/orx:meta/orx:instanceID';
    const instanceIdEl = doc.get( `${xformsPath} | ${openrosaPath}`, NAMESPACES );

    if ( !instanceIdEl ) {
        const rootEl = doc.get( '/xmlns:root/xmlns:model/xmlns:instance/*', NAMESPACES );
        const metaEl = doc.get( '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta', NAMESPACES );

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
    const replacements = {};

    // First turn all outputs into text so *<span class="or-output></span>* can be detected
    htmlDoc.find( '/root/form//span[contains(@class, "or-output")]' ).forEach( ( el, index ) => {
        const key = `---output-${index}`;
        const textNode = el.childNodes()[ 0 ].clone();
        replacements[ key ] = el.toString();
        textNode.text( key );
        el.replace( textNode );
        // Note that we end up in a situation where we likely have sibling text nodes...
    } );

    // Now render markdown
    htmlDoc.find( '/root/form//span[contains(@class, "question-label") or contains(@class, "or-hint")]' ).forEach( ( el, index ) => {
        let key;
        /**
         * Using text() is done because:
         * a) We are certain that these <span>s do not contain other elements, other than formatting/markdown <span>s.
         * b) This avoids the need to merge any sibling text nodes that could have been created in the previous step.
         *
         * Note that text() will convert &gt; to >
         */
        const original = el.text().replace( '<', '&lt;' ).replace( '>', '&gt;' );
        const rendered = markdown.toHtml( original );
        if ( original !== rendered ) {
            key = `$$$${index}`;
            replacements[ key ] = rendered;
            el.text( key );
        }
    } );

    // TODO: does this result in self-closing tags?
    let htmlStr = _docToString( htmlDoc );

    // Now replace the placeholders with the rendered HTML
    // in reverse order so outputs are done last
    Object.keys( replacements ).reverse().forEach( key => {
        const replacement = replacements[ key ];
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
    const hash = crypto.createHash( 'md5' );
    hash.update( message );
    return hash.digest( 'hex' );
}

module.exports = {
    transform,
    version,
    NAMESPACES
};