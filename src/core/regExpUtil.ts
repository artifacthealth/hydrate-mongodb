/**
 * Clones a regular expression.
 * @param source The source regular expression
 * @hidden
 */
export function clone(source: RegExp): RegExp {

    var flags: string[] = [];
    if (source.global) {
        flags.push('g');
    }
    if (source.multiline) {
        flags.push('m');
    }
    if (source.ignoreCase) {
        flags.push('i');
    }
    return new RegExp(source.source, flags.join(''));
}

