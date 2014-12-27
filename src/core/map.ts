interface Map<T> {
    [index: string]: T;
}

module Map {
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    export function hasProperty<T>(map: Map<T>, key: string): boolean {
        return hasOwnProperty.call(map, key);
    }

    export function getProperty<T>(map: Map<T>, key: string): T {
        return hasOwnProperty.call(map, key) ? map[key] : undefined;
    }

    export function isEmpty<T>(map: Map<T>) {
        for (var id in map) {
            if (hasProperty(map, id)) {
                return false;
            }
        }

        return true;
    }

    export function clone<T>(object: T): T {
        var result: any = {};
        for (var id in object) {
            result[id] = (<any>object)[id];
        }
        return <T>result;
    }

    export function forEachValue<T, U>(map: Map<T>, callback: (value: T) => U): U {
        var result: U;
        for (var id in map) {
            if (result = callback(map[id])) break;
        }
        return result;
    }

    export function forEachKey<T, U>(map: Map<T>, callback: (key: string) => U): U {
        var result: U;
        for (var id in map) {
            if (result = callback(id)) break;
        }
        return result;
    }

    export function lookUp<T>(map: Map<T>, key: string): T {
        return hasProperty(map, key) ? map[key] : undefined;
    }

    export function mapToArray<T>(map: Map<T>): T[] {
        var result: T[] = [];

        for (var id in map) {
            result.push(map[id]);
        }

        return result;
    }

    /**
     * Creates a map from the elements of an array.
     *
     * @param array the array of input elements.
     * @param makeKey a function that produces a key for a given element.
     *
     * This function makes no effort to avoid collisions; if any two elements produce
     * the same key with the given 'makeKey' function, then the element with the higher
     * index in the array will be the one associated with the produced key.
     */
    export function arrayToMap<T>(array: T[], makeKey: (value: T) => string): Map<T> {
        var result: Map<T> = {};

        for (var i = 0, l = array.length; i < l; i++) {
            var value = array[i];
            result[makeKey(value)] = value;
        }

        return result;
    }

    var nextHashCode = 1;
    var hashCodeName = "__hashCode" + (new Date().getTime()) + "__";

    export function setHashCode(obj: any, hashCode: string): string {

        if(!Object.isExtensible(obj)) {
            throw new Error("Cannot set hash code for object that is not extensible.");
        }

        Object.defineProperty(obj, hashCodeName, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: hashCode
        });

        return hashCode;
    }

    /**
     * Gets a unique identifier for objects that can be used as the key for a map.
     * @param obj The object for which the hash code should be returned.
     */
    export function getHashCode(obj: any): string {

        if(hasProperty(obj, hashCodeName)) {
            return obj[hashCodeName];
        }
        return setHashCode(obj, (nextHashCode++).toString());
    }
}

export = Map;