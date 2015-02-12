import QueryDocument = require("./queryDocument");
import ResolveContext = require("../mapping/resolveContext");
import MappingFlags = require("../mapping/mappingFlags");
import ArrayMapping = require("../mapping/arrayMapping");
import Mapping = require("../mapping/mapping");
import MappingError = require("../mapping/mappingError");
import RegExpUtil = require("../core/regExpUtil");
import CriteriaBuilder = require("./criteriaBuilder");
import ObjectMapping = require("../mapping/objectMapping");
import ClassMapping = require("../mapping/classMapping");
import EntityMapping = require("../mapping/entityMapping");

class UpdateDocumentBuilder extends CriteriaBuilder {

    build(updateDocument: QueryDocument): QueryDocument {

        this.error = undefined;
        if(!updateDocument) return {};

        var result: QueryDocument = {};
        for(var operator in updateDocument) {
            if (updateDocument.hasOwnProperty(operator)) {
                if (operator[0] != "$") {
                    this.error = new Error("Replacement documents are not support in updates. Use the Session's 'save' method.");
                    return null;
                }

                var fields = updateDocument[operator];
                if(!fields) {
                    this.error = new Error("Missing value for operator '" + operator + "'.");
                    return null;
                }

                var preparedFields: QueryDocument = {};

                if(operator == '$pull') {
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

                            var mapping = context.resolvedMapping,
                                value = fields[field],
                                preparedValue: any;

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
                                    if (!this._isArray(operator, mapping)) return null;
                                    if (this.isQueryExpression(value)) {
                                        preparedValue = this._prepareQueryModifier(operator, value, (<ArrayMapping>mapping).elementMapping);
                                        break;
                                    }
                                    preparedValue = this.prepareQueryValue(operator, value, (<ArrayMapping>mapping).elementMapping);
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
                                    if (!this._isArray(operator, mapping)) return null;
                                    preparedValue = this.prepareArrayOfValues(operator, value, (<ArrayMapping>mapping).elementMapping);
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
    }

    private _isArray(operator: string, mapping: Mapping): boolean {
        if(!(mapping.flags & MappingFlags.Array)) {
            this.error = new Error("Operator '" + operator + "' only applies to properties that have an array type.");
            return false;
        }
        return true;
    }

    private _prepareQueryModifier(operator: string, query: QueryDocument, mapping: Mapping): QueryDocument {

        if(!query) {
            this.error = new Error("Missing value for operator '" + operator + "'.");
            return null;
        }

        var result: QueryDocument = {};

        for(var key in query) {
            if (query.hasOwnProperty(key)) {
                if(key[0] != "$") {
                    this.error = new Error("Unexpected value '" + key + "' in query expression.");
                    return null;
                }
                var value = query[key],
                    preparedValue: any;

                switch(key) {
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
    }

    private _prepareSortSpecification(sortSpecification: any, mapping: Mapping): any {

        if(mapping.flags & MappingFlags.Embeddable) {
            if(typeof sortSpecification !== "object") {
                this.error = new Error("Value of $sort must be an object if sorting an array of embedded documents.");
            }

            var result: QueryDocument = {};

            for(var field in sortSpecification) {
                if (sortSpecification.hasOwnProperty(field)) {

                    var property = (<ObjectMapping>mapping).getProperty(field);
                    if (property === undefined) {
                        if(mapping.flags & MappingFlags.Class) {
                            this.error = new Error("Unknown property '" + field + "' for class '" + (<ClassMapping>mapping).name +"' in $sort.");
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

        if(typeof sortSpecification !== "number") {
            this.error = new Error("Value of $sort must be a number if sorting an array that does not contain embedded documents.");
        }

        return sortSpecification;
    }
}

export = UpdateDocumentBuilder;