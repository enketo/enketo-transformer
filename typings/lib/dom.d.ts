// These types *should* be more specific in the base `dom` lib.
interface DOMParser {
    parseFromString<T extends DOMMimeType>(
        string: string,
        type: DOMMimeType
    ): DocumentFromMimeType<T>;
}

interface Node {
    // There is no scenario I'm aware of where cloning, say, an `Element`
    // would produce a `Node` of a different or less specific type.
    cloneNode<T extends Node>(this: T, deep?: boolean): T;
}
