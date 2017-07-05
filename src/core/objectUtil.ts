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

export function shallowEqual(obj1: any, obj2: any): any {

    if (obj1 === obj2) {
        return true;
    }

    if (!isObject(obj1) || !isObject(obj2)) {
        return false;
    }

    var key: string;

    for (key in obj1) {
        if (obj1.hasOwnProperty(key) && obj1[key] !== obj2[key]) {
            return false;
        }
    }

    for (key in obj2) {
        if (obj2.hasOwnProperty(key) && obj2[key] !== obj1[key]) {
            return false;
        }
    }

    return true;
}

/**
 * @hidden
 */
export function isObject(obj: any): boolean {

    return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
