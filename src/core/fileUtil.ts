import * as path from "path";

export function hasExtension(path: string, ext: string): boolean {

    return path.length > ext.length && path.substr(path.length - ext.length, ext.length) === ext;
}

export function absolutePath(relativePath: string): string {

    return path.join(process.cwd(), relativePath);
}