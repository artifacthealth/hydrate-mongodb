import * as path from "path";

/**
 * Returns true if a file has the specified extension.
 * @param path The path to check.
 * @param ext The extension.
 * @hidden
 */
export function hasExtension(path: string, ext: string): boolean {

    return path.length > ext.length && path.substr(path.length - ext.length, ext.length) === ext;
}

/**
 * Returns the absolute path for a relative path.
 * @param relativePath The realative path to make absolute.
 * @hidden
 */
export function absolutePath(relativePath: string): string {

    return path.join(process.cwd(), relativePath);
}