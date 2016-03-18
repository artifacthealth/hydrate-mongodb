/**
 * Returns true if the object is a Set; otherwise, returns false.
 * @param obj The object to check.
 * @hidden
 */
export function isSet(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Set]';
}

/**
 * Returns true if the object is a Map; otherwise, returns false.
 * @param obj The object to check.
 * @hidden
 */
export function isMap(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Map]';
}

/**
 * Returns true if the object is iterable; otherwise, return false.
 * @param obj The object to check
 * @hidden
 */
export function isIterable(obj: any): boolean {

    if (obj == null) {
        return false;
    }

    return obj[Symbol.iterator] !== undefined;
}

/**
 * Returns true if the object is the constructor of an iterable class.
 * @param obj The object to check.
 * @hidden
 */
export function isIterableConstructor(obj: any): boolean {

    if (obj == null || obj.prototype == null) {
        return false;
    }

    return obj.prototype[Symbol.iterator] !== undefined;
}