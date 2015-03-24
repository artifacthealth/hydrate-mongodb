var Map;
(function (Map) {
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function hasProperty(map, key) {
        return hasOwnProperty.call(map, key);
    }
    Map.hasProperty = hasProperty;
    function getProperty(map, key) {
        return hasOwnProperty.call(map, key) ? map[key] : undefined;
    }
    Map.getProperty = getProperty;
    function isEmpty(map) {
        for (var id in map) {
            if (hasProperty(map, id)) {
                return false;
            }
        }
        return true;
    }
    Map.isEmpty = isEmpty;
    function clone(object) {
        var result = {};
        for (var id in object) {
            result[id] = object[id];
        }
        return result;
    }
    Map.clone = clone;
    function forEachValue(map, callback) {
        var result;
        for (var id in map) {
            if (result = callback(map[id]))
                break;
        }
        return result;
    }
    Map.forEachValue = forEachValue;
    function forEachKey(map, callback) {
        var result;
        for (var id in map) {
            if (result = callback(id))
                break;
        }
        return result;
    }
    Map.forEachKey = forEachKey;
    function lookUp(map, key) {
        return hasProperty(map, key) ? map[key] : undefined;
    }
    Map.lookUp = lookUp;
    function mapToArray(map) {
        var result = [];
        for (var id in map) {
            result.push(map[id]);
        }
        return result;
    }
    Map.mapToArray = mapToArray;
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
    function arrayToMap(array, makeKey) {
        var result = {};
        for (var i = 0, l = array.length; i < l; i++) {
            var value = array[i];
            result[makeKey(value)] = value;
        }
        return result;
    }
    Map.arrayToMap = arrayToMap;
    var nextHashCode = 1;
    var hashCodeName = "__hashCode" + (new Date().getTime()) + "__";
    // V8 cannot optimize property access if variable is used for property name, so we generate a function for access.
    // See Angular design doc here: http://tinyurl.com/kap2g2r
    var _getHashCode = (new Function("o", "return o['" + hashCodeName + "']"));
    function setHashCode(obj, hashCode) {
        if (!Object.isExtensible(obj)) {
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
    Map.setHashCode = setHashCode;
    /**
     * Gets a unique identifier for objects that can be used as the key for a map.
     * @param obj The object for which the hash code should be returned.
     */
    function getHashCode(obj) {
        return _getHashCode(obj) || setHashCode(obj, (nextHashCode++).toString());
    }
    Map.getHashCode = getHashCode;
})(Map || (Map = {}));
module.exports = Map;
