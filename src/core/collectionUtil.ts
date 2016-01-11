export function isSet(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Set]';
}

export function isMap(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Map]';
}

export function isIterable(obj: any): boolean {

    if (obj == null) {
        return false;
    }

    return obj[Symbol.iterator] !== undefined;
}

export function isIterableConstructor(obj: any): boolean {

    if (obj == null || obj.prototype == null) {
        return false;
    }

    return obj.prototype[Symbol.iterator] !== undefined;
}