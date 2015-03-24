var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Map = require("../core/map");
var MappingBase = require("./mappingBase");
var ObjectMapping = (function (_super) {
    __extends(ObjectMapping, _super);
    function ObjectMapping() {
        _super.call(this, 64 /* Object */ | 2048 /* Embeddable */);
        this.properties = [];
        this._propertiesByName = {};
        this._propertiesByField = {};
    }
    ObjectMapping.prototype.addProperty = function (property) {
        if (!property) {
            throw new Error("Missing required argument 'property'.");
        }
        if (!property.name) {
            throw new Error("Property is missing 'name'.");
        }
        if (!property.field) {
            throw new Error("Property is missing 'field'.");
        }
        if (Map.hasProperty(this._propertiesByName, property.name)) {
            throw new Error("There is already a mapped property with the name '" + property.name + "'.");
        }
        if (Map.hasProperty(this._propertiesByField, property.field)) {
            throw new Error("There is already a mapped property for field '" + property.field + "'.");
        }
        this._propertiesByName[property.name] = property;
        this._propertiesByField[property.field] = property;
        this.properties.push(property);
        return property;
    };
    ObjectMapping.prototype.getProperty = function (name) {
        if (!name) {
            throw new Error("Missing required argument 'name'.");
        }
        return Map.getProperty(this._propertiesByName, name);
    };
    ObjectMapping.prototype.getPropertyForField = function (field) {
        return Map.getProperty(this._propertiesByField, field);
    };
    ObjectMapping.prototype.getProperties = function (flags) {
        if (!flags) {
            return this.properties;
        }
        // TODO: cache search results
        var ret = [];
        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            if ((property.flags & flags) !== 0) {
                ret.push(property);
            }
        }
        return ret;
    };
    ObjectMapping.prototype.read = function (context, value) {
        return this.readObject(context, {}, value, false);
    };
    ObjectMapping.prototype.readObject = function (context, obj, value, checkRemoved) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value !== "object") {
            context.addError("Expected value to be an object.");
            return;
        }
        var base = context.path ? context.path + "." : "", properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            // skip fields that are not persisted
            if (property.flags & (1 /* Ignored */ | 64 /* InverseSide */)) {
                continue;
            }
            var fieldValue = property.getFieldValue(value), propertyValue = undefined;
            // skip undefined values
            if (fieldValue !== undefined) {
                // skip null values unless allowed
                if (fieldValue === null) {
                    if (property.flags & 128 /* Nullable */) {
                        propertyValue = null;
                    }
                }
                else {
                    var savedPath = context.path;
                    context.path = base + property.name;
                    propertyValue = property.mapping.read(context, fieldValue);
                    context.path = savedPath;
                }
            }
            if (propertyValue !== undefined) {
                property.setPropertyValue(obj, propertyValue);
            }
            else {
                // If the flag to check for removed properties is set, delete the property if the object has a value
                // but the document does not.
                if (checkRemoved && property.getPropertyValue(obj) !== undefined) {
                    // Deleting a property from an object causes the object to become non-optimized in V8. So we
                    // will just set the property value to undefined instead of deleting it. The resulting object is
                    // not exactly the same as if we had called delete but it's not worth the performance hit to
                    // call delete.
                    property.setPropertyValue(obj, undefined);
                }
            }
        }
        // if there is an observer in the context, then watch this object for changes.
        if (context.observer) {
            context.observer.watch(obj);
        }
        return obj;
    };
    ObjectMapping.prototype.write = function (value, path, errors, visited) {
        return this.writeObject({}, value, path, errors, visited);
    };
    ObjectMapping.prototype.writeObject = function (document, value, path, errors, visited) {
        var base = path ? path + "." : "", properties = this.properties, fieldValue;
        if (this.flags & 2048 /* Embeddable */) {
            if (visited.indexOf(value) !== -1) {
                errors.push({ message: "Recursive reference of embedded object is not allowed.", path: path, value: value });
                return;
            }
            visited.push(value);
        }
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i], flags = property.flags;
            // skip fields that are not persisted
            if (flags & (1 /* Ignored */ | 64 /* InverseSide */)) {
                continue;
            }
            var propertyValue = property.getPropertyValue(value);
            if (propertyValue === undefined) {
                continue;
            }
            if (propertyValue === null) {
                // skip null values unless allowed
                if (!(flags & 128 /* Nullable */)) {
                    continue;
                }
                fieldValue = null;
            }
            else {
                fieldValue = property.mapping.write(propertyValue, base + property.name, errors, visited);
            }
            property.setFieldValue(document, fieldValue);
        }
        visited.pop();
        return document;
    };
    ObjectMapping.prototype.watch = function (value, observer, visited) {
        if (!value || typeof value != "object")
            return;
        if (this.flags & 2048 /* Embeddable */) {
            if (visited.indexOf(value) !== -1)
                return;
            visited.push(value);
        }
        observer.watch(value);
        for (var i = 0, l = this.properties.length; i < l; i++) {
            var property = this.properties[i];
            // if the property is not ignored and it has the specified flags, then walk the value of the property
            if (!(property.flags & 1 /* Ignored */)) {
                property.mapping.watch(property.getPropertyValue(value), observer, visited);
            }
        }
    };
    ObjectMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        if (typeof documentValue1 !== "object" || typeof documentValue2 !== "object") {
            return false;
        }
        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            // skip fields that are not persisted
            if (property.flags & (1 /* Ignored */ | 64 /* InverseSide */)) {
                continue;
            }
            // get the field values from the documents
            var fieldValue1 = property.getFieldValue(documentValue1);
            var fieldValue2 = property.getFieldValue(documentValue2);
            if (fieldValue1 !== fieldValue2 && !property.mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }
        return true;
    };
    ObjectMapping.prototype.walk = function (session, value, flags, entities, embedded, references) {
        if (!value || typeof value !== "object")
            return;
        if (this.flags & 2048 /* Embeddable */) {
            if (embedded.indexOf(value) !== -1)
                return;
            embedded.push(value);
        }
        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            // if the property is not ignored and it has the specified flags, then walk the value of the property
            if (!(property.flags & 1 /* Ignored */) && ((property.flags & flags) || ((flags & 511 /* All */) == 0))) {
                property.mapping.walk(session, property.getPropertyValue(value), flags, entities, embedded, references);
            }
        }
    };
    ObjectMapping.prototype.fetch = function (session, parentEntity, value, path, depth, callback) {
        if (!value || typeof value !== "object" || depth == path.length) {
            return callback(null, value);
        }
        var property = this.getProperty(path[depth]);
        if (property === undefined) {
            return callback(new Error("Undefined property '" + path[depth] + "' in path '" + path.join(".") + "'."));
        }
        // TODO: In mapping validation, throw error if object that holds inverse side of relationship is not an entity
        var propertyValue = property.getPropertyValue(value);
        if ((property.flags & 64 /* InverseSide */) && propertyValue === undefined) {
            property.mapping.fetchInverse(session, parentEntity, property.inverseOf, path, depth + 1, handleCallback);
        }
        else {
            property.mapping.fetch(session, parentEntity, propertyValue, path, depth + 1, handleCallback);
        }
        function handleCallback(err, result) {
            if (err)
                return callback(err);
            if (propertyValue !== result) {
                property.setPropertyValue(value, result);
            }
            callback(null, value);
        }
    };
    ObjectMapping.prototype._resolveCore = function (context) {
        var property = this.getProperty(context.currentProperty);
        if (property === undefined) {
            if (this.flags & 4 /* Class */) {
                context.setError("Undefined property for class '" + this.name + "'.");
            }
            else {
                context.setError("Undefined property.");
            }
            return;
        }
        if ((property.flags & 64 /* InverseSide */)) {
            context.setError("Cannot resolve inverse side of relationship.");
        }
        if (context.resolveProperty(property.mapping, property.field)) {
            return; // reached end of path
        }
        property.mapping.resolve(context);
    };
    return ObjectMapping;
})(MappingBase);
module.exports = ObjectMapping;
