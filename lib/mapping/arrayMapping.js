var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Async = require("../core/async");
var MappingBase = require("./mappingBase");
var ArrayMapping = (function (_super) {
    __extends(ArrayMapping, _super);
    function ArrayMapping(elementMapping) {
        _super.call(this, 1 /* Array */);
        this.elementMapping = elementMapping;
    }
    ArrayMapping.prototype.read = function (context, value) {
        if (!Array.isArray(value)) {
            context.addError("Expected array.");
            return;
        }
        // TODO: remove items scheduled for delete from array
        var result = new Array(value.length), mapping = this.elementMapping;
        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];
            // treat undefined values as null
            if (item === undefined) {
                item = null;
            }
            result[i] = mapping.read(context, item);
        }
        // if there is an observer in the context, then watch this array for changes.
        if (context.observer) {
            context.observer.watch(result);
        }
        return result;
    };
    ArrayMapping.prototype.write = function (value, path, errors, visited) {
        if (!Array.isArray(value)) {
            errors.push({ message: "Expected array.", path: path, value: value });
        }
        var result = new Array(value.length), mapping = this.elementMapping;
        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];
            // treat undefined values as null
            if (item === undefined) {
                item = null;
            }
            result[i] = mapping.write(item, path, errors, visited);
        }
        return result;
    };
    ArrayMapping.prototype.watch = function (value, observer, visited) {
        if (!value || !Array.isArray(value))
            return;
        observer.watch(value);
        for (var i = 0, l = value.length; i < l; i++) {
            this.elementMapping.watch(value[i], observer, visited);
        }
    };
    ArrayMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        if (!Array.isArray(documentValue1) || !Array.isArray(documentValue2) || documentValue1.length != documentValue2.length) {
            return false;
        }
        var mapping = this.elementMapping;
        for (var i = 0, l = documentValue1.length; i < l; i++) {
            // get the field values from the documents
            var fieldValue1 = documentValue1[i];
            var fieldValue2 = documentValue2[i];
            if (fieldValue1 !== fieldValue2 && !mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }
        return true;
    };
    ArrayMapping.prototype.walk = function (session, value, flags, entities, embedded, references) {
        if (!Array.isArray(value)) {
            return;
        }
        var mapping = this.elementMapping;
        for (var i = 0, l = value.length; i < l; i++) {
            mapping.walk(session, value[i], flags, entities, embedded, references);
        }
    };
    ArrayMapping.prototype.fetch = function (session, parentEntity, value, path, depth, callback) {
        if (!Array.isArray(value) || value.length == 0) {
            return callback(null, value);
        }
        // TODO: warn in documentation that if array is modified before this callback returns then results are unpredictable
        var mapping = this.elementMapping;
        Async.forEach(value, function (item, index, done) {
            // note, depth is not incremented for array
            mapping.fetch(session, parentEntity, item, path, depth, function (err, result) {
                if (err)
                    return done(err);
                if (item !== result) {
                    value[index] = result;
                }
                done();
            });
        }, function (err) {
            if (err)
                return callback(err);
            callback(null, value);
        });
    };
    ArrayMapping.prototype.fetchInverse = function (session, parentEntity, propertyName, path, depth, callback) {
        var _this = this;
        if (!parentEntity) {
            return callback(new Error("Parent entity required to resolve inverse relationship."));
        }
        if (!(this.elementMapping.flags & 1024 /* Entity */)) {
            return callback(new Error("Element mapping must be an entity to resolve inverse relationship."));
        }
        session.getPersister(this.elementMapping).findInverseOf(parentEntity, propertyName, function (err, value) {
            if (err)
                return callback(err);
            _this.fetch(session, _this, value, path, depth, callback);
        });
    };
    ArrayMapping.prototype._resolveCore = function (context) {
        var property = context.currentProperty, index;
        if (property == "$" || ((index = parseInt(property)) === index)) {
            // this is the positional operator or an index
            if (context.resolveProperty(this.elementMapping, property)) {
                return; // reached end of path
            }
        }
        this.elementMapping.resolve(context);
    };
    Object.defineProperty(ArrayMapping.prototype, "nestedDepth", {
        /**
         * Gets the maximum depth of nested array and tuple mappings
         */
        get: function () {
            if (this._nestedDepth !== undefined) {
                this._nestedDepth = this._findNestedDepth(0, this);
            }
            return this._nestedDepth;
        },
        enumerable: true,
        configurable: true
    });
    ArrayMapping.prototype._findNestedDepth = function (depth, mapping) {
        if (mapping.flags & 1 /* Array */) {
            return this._findNestedDepth(depth + 1, mapping.elementMapping);
        }
        else if (mapping.flags & 512 /* Tuple */) {
            var elementMappings = mapping.elementMappings;
            for (var i = 0, l = elementMappings.length; i < l; i++) {
                depth = Math.max(depth, this._findNestedDepth(depth + 1, elementMappings[i]));
            }
        }
        return depth;
    };
    return ArrayMapping;
})(MappingBase);
module.exports = ArrayMapping;
