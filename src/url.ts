/**
 * @package
 *
 * @param value - a fully qualified URL, or a relative path
 */
export const escapeURLPath = (value: string): string => {
    if (value === 'form_logo.png') {
        return value;
    }

    const [scheme] = value.match(/^[a-z]+:/) ?? [];
    const isFullyQualified = scheme != null;
    const urlString = isFullyQualified
        ? value.replace(/^jr:\/*/, 'http://')
        : `http://example.com/${value.replace(/^\//, '')}`;
    const url = new URL(urlString);

    if (isFullyQualified) {
        return url.href.replace('http:', scheme);
    }

    const { pathname, search } = url;
    const path = value.startsWith('/') ? pathname : pathname.replace(/^\//, '');

    return `${path}${search}`;
};

/** @package */
export const getMediaPath = (
    mediaMap: Record<string, string>,
    mediaURL: string
) => {
    const mediaPath = mediaURL.match(/jr:\/\/[\w-]+\/(.+)/);

    if (mediaPath == null) {
        return escapeURLPath(mediaURL);
    }

    const path = escapeURLPath(mediaPath[1]);
    const value = mediaMap[path];

    return escapeURLPath(value || mediaURL);
};
