var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var CriteriaBuilder = require("./criteriaBuilder");
var UpdateDocumentBuilder = (function (_super) {
    __extends(UpdateDocumentBuilder, _super);
    function UpdateDocumentBuilder() {
        _super.apply(this, arguments);
    }
    UpdateDocumentBuilder.prototype.build = function (updateDocument) {
        this.error = undefined;
        if (!updateDocument)
            return {};
        var result = {};
        for (var operator in updateDocument) {
            if (updateDocument.hasOwnProperty(operator)) {
                if (operator[0] != "$") {
                    this.error = new Error("Replacement documents are not support in updates. Use the Session's 'save' method.");
                    return null;
                }
                var fields = updateDocument[operator];
                if (!fields) {
                    this.error = new Error("Missing value for operator '" + operator + "'.");
                    return null;
                }
                var preparedFields = {};
                if (operator == '$pull') {
                    // pull operator take a query document
                    // NOTE: unlike most of the other array operators we are not confirming that it's used on properties
                    // that have an array type.
                    preparedFields = this.prepareQueryDocument(fields, this.mapping);
                }
                else {
                    for (var field in fields) {
                        if (fields.hasOwnProperty(field)) {
                            // resolve field path
                            var context = this.mapping.resolve(field);
                            if (context.error) {
                                this.error = context.error;
                                return null;
                            }
                            var mapping = context.resolvedMapping, value = fields[field], preparedValue;
                            switch (operator) {
                                case '$currentDate':
                                case '$inc':
                                case '$mul':
                                case '$rename':
                                case '$unset':
                                case '$pop':
                                case '$bit':
                                    //fields with constant
                                    preparedValue = value;
                                    break;
                                case '$addToSet':
                                case '$push':
                                    // fields with value and optional modifier
                                    if (!this._isArray(operator, mapping))
                                        return null;
                                    if (this.isQueryExpression(value)) {
                                        preparedValue = this._prepareQueryModifier(operator, value, mapping.elementMapping);
                                        break;
                                    }
                                    preparedValue = this.prepareQueryValue(operator, value, mapping.elementMapping);
                                    break;
                                case '$max':
                                case '$min':
                                case '$setOnInsert':
                                case '$set':
                                    // fields with value
                                    preparedValue = this.prepareQueryValue(operator, value, mapping);
                                    break;
                                case '$pullAll':
                                case '$pushAll':
                                    // handle array of values
                                    if (!this._isArray(operator, mapping))
                                        return null;
                                    preparedValue = this.prepareArrayOfValues(operator, value, mapping.elementMapping);
                                    break;
                                default:
                                    this.error = new Error("Unknown query operator '" + operator + "'.");
                                    return null;
                            }
                            preparedFields[context.resolvedPath] = preparedValue;
                        }
                    }
                }
                result[operator] = preparedFields;
            }
        }
        return result;
    };
    UpdateDocumentBuilder.prototype._isArray = function (operator, mapping) {
        if (!(mapping.flags & 1 /* Array */)) {
            this.error = new Error("Operator '" + operator + "' only applies to properties that have an array type.");
            return false;
        }
        return true;
    };
    UpdateDocumentBuilder.prototype._prepareQueryModifier = function (operator, query, mapping) {
        if (!query) {
            this.error = new Error("Missing value for operator '" + operator + "'.");
            return null;
        }
        var result = {};
        for (var key in query) {
            if (query.hasOwnProperty(key)) {
                if (key[0] != "$") {
                    this.error = new Error("Unexpected value '" + key + "' in query expression.");
                    return null;
                }
                var value = query[key], preparedValue;
                switch (key) {
                    case '$each':
                        // handle array of values
                        preparedValue = this.prepareArrayOfValues(key, value, mapping);
                        break;
                    case '$position':
                    case '$slice':
                        preparedValue = value;
                        break;
                    case '$sort':
                        preparedValue = this._prepareSortSpecification(value, mapping);
                        break;
                    default:
                        this.error = new Error("Unknown query modifier '" + key + "'.");
                        return null;
                }
                result[key] = preparedValue;
            }
        }
        return result;
    };
    UpdateDocumentBuilder.prototype._prepareSortSpecification = function (sortSpecification, mapping) {
        if (mapping.flags & 2048 /* Embeddable */) {
            if (typeof sortSpecification !== "object") {
                this.error = new Error("Value of $sort must be an object if sorting an array of embedded documents.");
            }
            var result = {};
            for (var field in sortSpecification) {
                if (sortSpecification.hasOwnProperty(field)) {
                    var property = mapping.getProperty(field);
                    if (property === undefined) {
                        if (mapping.flags & 4 /* Class */) {
                            this.error = new Error("Unknown property '" + field + "' for class '" + mapping.name + "' in $sort.");
                        }
                        else {
                            this.error = new Error("Unknown property '" + field + "' in $sort.");
                        }
                        return;
                    }
                    property.setFieldValue(result, this.prepareQueryValue(property.name, property.getPropertyValue(sortSpecification), property.mapping));
                }
            }
            return result;
        }
        if (typeof sortSpecification !== "number") {
            this.error = new Error("Value of $sort must be a number if sorting an array that does not contain embedded documents.");
        }
        return sortSpecification;
    };
    return UpdateDocumentBuilder;
})(CriteriaBuilder);
module.exports = UpdateDocumentBuilder;
