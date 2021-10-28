/**
 * @param {string} value - a fully qualified URL, or a relative path
 * @return {string}
 */
function escapeURLPath( value ) {
    const isFullyQualified = ( /^[a-z]+:/i ).test( value );
    const urlString = isFullyQualified ? value : `file:///${value.replace( /^\//, '' )}`;
    const url = new URL( urlString );

    if ( isFullyQualified ) {
        return url.href;
    }

    const { pathname, search } = url;
    const path = value.startsWith( '/' ) ? pathname : pathname.replace( /^\//, '' );

    return `${path}${search}`;
}

/**
 * @param {Record<string, string>} mediaMap
 * @param {string} mediaURL
 */
function getMediaPath( mediaMap, mediaURL ) {
    const mediaPath = mediaURL.match( /jr:\/\/[\w-]+\/(.+)/ );

    if ( mediaPath == null ) {
        return escapeURLPath( mediaURL );
    }

    const path = escapeURLPath( mediaPath[1] );
    const value = mediaMap[ path ];

    return value || escapeURLPath( mediaURL );
}

module.exports = {
    escapeURLPath,
    getMediaPath,
};
