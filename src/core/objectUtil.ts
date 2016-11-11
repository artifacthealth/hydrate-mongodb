/**
 * @hidden
 */
export function shallowClone(obj: any): any {

    if (!isObject(obj)) {
        return null;
    }

    var clone: any = {};

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = obj[key];
        }
    }

    return clone;
}

/**
 * @hidden
 */
export function isObject(obj: any): boolean {

    return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
