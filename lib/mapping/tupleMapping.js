var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var TupleMapping = (function (_super) {
    __extends(TupleMapping, _super);
    function TupleMapping(elementMappings) {
        _super.call(this, 512 /* Tuple */);
        this.elementMappings = elementMappings;
    }
    TupleMapping.prototype.read = function (context, value) {
        if (!Array.isArray(value)) {
            context.addError("Expected tuple.");
            return;
        }
        var mappings = this.elementMappings;
        if (value.length != mappings.length) {
            context.addError("Expected " + mappings.length + " elements in tuple but source had " + value.length + ".");
            return;
        }
        var result = new Array(value.length);
        for (var i = 0, l = mappings.length; i < l; i++) {
            var savedPath = context.path;
            context.path += "." + i;
            result[i] = mappings[i].read(context, value[i]);
            context.path = savedPath;
        }
        // if there is an observer in the context, then watch this tuple for changes.
        if (context.observer) {
            context.observer.watch(result);
        }
        return result;
    };
    TupleMapping.prototype.write = function (value, path, errors, visited) {
        if (!Array.isArray(value)) {
            errors.push({ message: "Expected tuple.", path: path, value: value });
            return;
        }
        var mappings = this.elementMappings;
        if (value.length != mappings.length) {
            errors.push({ message: "Expected " + mappings.length + " elements in tuple but source had " + value.length + ".", path: path, value: value });
            return;
        }
        // TODO: treat undefined as null?
        var result = new Array(value.length);
        for (var i = 0, l = mappings.length; i < l; i++) {
            result[i] = mappings[i].write(value[i], path + "." + i, errors, visited);
        }
        return result;
    };
    TupleMapping.prototype.watch = function (value, observer, visited) {
        if (!value || !Array.isArray(value))
            return;
        observer.watch(value);
        for (var i = 0, l = Math.min(value.length, this.elementMappings.length); i < l; i++) {
            this.elementMappings[i].watch(value[i], observer, visited);
        }
    };
    TupleMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        if (!Array.isArray(documentValue1) || !Array.isArray(documentValue2) || documentValue1.length != documentValue2.length) {
            return false;
        }
        var mappings = this.elementMappings;
        if (documentValue1.length != mappings.length) {
            return false;
        }
        for (var i = 0, l = mappings.length; i < l; i++) {
            // get the field values from the documents
            var fieldValue1 = documentValue1[i];
            var fieldValue2 = documentValue2[i];
            if (fieldValue1 !== fieldValue2 && !mappings[i].areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }
        return true;
    };
    TupleMapping.prototype.walk = function (session, value, flags, entities, embedded, references) {
        if (!Array.isArray(value)) {
            return;
        }
        var mappings = this.elementMappings;
        for (var i = 0, l = Math.min(value.length, mappings.length); i < l; i++) {
            mappings[i].walk(session, value[i], flags, entities, embedded, references);
        }
    };
    TupleMapping.prototype.fetch = function (session, parentEntity, value, path, depth, callback) {
        if (!Array.isArray(value) || depth == path.length) {
            return callback(null, value);
        }
        var index = parseInt(path[depth]);
        if (index !== index || index < 0 || index >= this.elementMappings.length) {
            return callback(new Error("Undefined tuple index '" + path[depth] + "' in path '" + path.join(".") + "'."));
        }
        var item = value[index];
        this.elementMappings[index].fetch(session, parentEntity, item, path, depth + 1, function (err, result) {
            if (err)
                return callback(err);
            if (item !== result) {
                value[index] = item;
            }
            callback(null, value);
        });
    };
    TupleMapping.prototype._resolveCore = function (context) {
        var property = context.currentProperty;
        if (property == "$") {
            // this is the positional operator
            context.setError("Cannot resolve positional operator for Tuple.");
            return;
        }
        else {
            // check if it's an array index
            var index = parseInt(property);
            if (index !== index || index < 0 || index >= this.elementMappings.length) {
                context.setError("Index out of range for Tuple.");
                return;
            }
            var elementMapping = this.elementMappings[index];
            if (context.resolveProperty(elementMapping, property)) {
                return; // reached end of path
            }
            elementMapping.resolve(context);
            return;
        }
        context.setError("Expected index for Tuple.");
    };
    return TupleMapping;
})(MappingBase);
module.exports = TupleMapping;
