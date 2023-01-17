/**
 * @package
 *
 * @param value - a fully qualified URL, or a relative path
 */
export const escapeURLPath = (value: string): string => {
    const isFullyQualified = /^[a-z]+:/i.test(value);
    const urlString = isFullyQualified
        ? value
        : `file:///${value.replace(/^\//, '')}`;
    const url = new URL(urlString);

    if (isFullyQualified) {
        return url.href;
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

    return value || escapeURLPath(mediaURL);
};
