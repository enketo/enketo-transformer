/**
 * @module language
 */

const tags = require( 'language-tags' );
const stringDirection = require( 'string-direction' );

/**
 * @typedef LanguageObj
 * @property {string} desc
 * @property {string} tag
 * @property {string} dir
 * @property {string} src
 */

/**
 * Parses a language string into a language object. Guesses missing properties.
 *
 * @static
 * @see http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
 * @param {string} lang - Language strings as included in the XForm.
 * @param {string} sample - A text sample.
 * @return {LanguageObj} language object.
 */
function parse( lang, sample ) {
    // TODO: this should be refactored
    let ianaLang;
    const language = {
        desc: lang.trim(),
        tag: lang.trim(),
        src: lang
    };
    const parts = lang.match( /^([^(]+)\((.*)\)\s*$/ );

    if ( parts && parts.length > 2 ) {
        language.desc = parts[ 1 ].trim();
        language.tag = parts[ 2 ].trim();
        ianaLang = _getLangWithTag( language.tag );
    } else {
        // First check whether lang is a known IANA subtag like 'en' or 'en-GB'
        ianaLang = _getLangWithTag( lang.split( '-' )[ 0 ] );
        if ( ianaLang ) {
            language.desc = ianaLang.descriptions()[ 0 ];
        } else {
            // Check whether IANA language can be found with description
            ianaLang = _getLangWithDesc( language.desc );
            if ( ianaLang ) {
                language.tag = ianaLang.data.subtag;
            }
        }
    }

    language.dir = _getDirectionality( sample );

    return language;
}

/**
 * Performs IANA search to find language object with provided description.
 *
 * @param {string} desc - Language description.
 * @return {LanguageObj} the first language object result that was found.
 */
function _getLangWithDesc( desc ) {
    const results = ( desc ) ? tags.search( desc ).filter( _languagesOnly ) : [];

    return results[ 0 ] || '';
}

/**
 * Performs IANA search to find language object with provided subtag.
 *
 * @param  {string} tag - Subtag.
 * @return {LanguageObj} the first language object result that was found.
 */
function _getLangWithTag( tag ) {
    return ( tag ) ? tags.subtags( tag ).filter( _languagesOnly )[ 0 ] : '';
}

/**
 * Filters objects with type "language" from a list of objects.
 *
 * @param  {LanguageObj} obj - Language object returned by 'language-tags' library.
 * @return {boolean} whether filter evaluated to true.
 */
function _languagesOnly( obj ) {
    return obj.data && obj.data.type === 'language';
}

/**
 * Obtains the directionality of a text sample.
 *
 * @param {string} sample - A text sample.
 * @return {string} either 'rtl' or the default 'ltr'.
 */
function _getDirectionality( sample ) {
    const direction = stringDirection.getDirection( sample );
    if ( direction !== 'ltr' ) {
        return 'rtl';
    }

    return direction;
}

module.exports = {
    parse
};
