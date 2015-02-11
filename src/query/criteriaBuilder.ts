import QueryDocument = require("./queryDocument");
import ResolveContext = require("../mapping/resolveContext");
import MappingFlags = require("../mapping/mappingFlags");
import ArrayMapping = require("../mapping/arrayMapping");
import Mapping = require("../mapping/mapping");
import MappingError = require("../mapping/mappingError");
import RegExpUtil = require("../core/regExpUtil");
import EntityMapping = require("../mapping/entityMapping");

class CriteriaBuilder {

    private _mapping: EntityMapping;

    /**
     * The last error encounter by the CriteriaBuilder. The value is cleared before each build.
     */
    error: Error;


    constructor(mapping: EntityMapping) {

        this._mapping = mapping;
    }

    build(criteria: QueryDocument): QueryDocument {

        this.error = undefined;

        var query = this._prepareQueryDocument(criteria);
        this._mapping.setDocumentDiscriminator(query);
        return query;
    }

    private _prepareQueryDocument(query: QueryDocument, mapping?: Mapping, withinField?: boolean): QueryDocument {

        if(!query) return query;

        if(!mapping) {
            mapping = this._mapping;
        }

        var result: QueryDocument = {};
        for(var key in query) {
            if(query.hasOwnProperty(key)) {
                var value = query[key],
                    preparedKey = key,
                    preparedValue: any = value;

                // check if this is an operator
                if(key[0] == "$") {
                    // check for top level operators that require recursive processing
                    if (key == "$and" || key == "$or" || key == "$nor") {
                        if (!Array.isArray(value)) {
                            this.error = new Error("Value of '" + key + "' operator should be an array.");
                            return null;
                        }

                        var arr = new Array(value.length);
                        for (var i = 0, l = value.length; i < l; i++) {
                            arr[i] = this._prepareQueryDocument(value[i], mapping);
                        }

                        preparedValue = arr;
                    }
                    else if(key == "$where" || key == "$text") {
                        // the $text operator doesn't contain any fields and we do not make any attempt to prepare
                        // field values in a $where operator, so we can just copy the value directly
                        if(withinField) {
                            this.error = new Error("Operator '" + key + "' is not allowed in $elemMatch.");
                            return null;
                        }

                        preparedValue = value;
                    }
                    else if(withinField) {
                        // if we have an operator and it's not one of the top-level operators, if we are within a field
                        // then process the query as a query expression. Currently, the only field level operator that
                        // allows this is $elemMatch.
                        return this._prepareQueryExpression(query, mapping);
                    }
                    else {
                        // the only valid top-level operators are $and, $or, $nor, $where, and $text
                        this.error = new Error("Unknown top-level operator '" + key + "'.");
                        return null;
                    }
                }
                else {
                    // If it's not an operator then it should be a field.
                    if(key == "_id") {
                        // special case for identity field
                        if(typeof value === "string") {
                            preparedValue = this._mapping.identity.fromString(value);
                        }
                    }
                    else {
                        // resolve field path
                        var context = new ResolveContext(key);
                        mapping.resolve(context);
                        if(context.error) {
                            this.error = context.error;
                            return null;
                        }
                        var resolvedMapping = context.resolvedMapping;

                        if(this._isQueryExpression(value)) {
                            // Need to prepare the query expression

                            if(resolvedMapping.flags & MappingFlags.Array) {
                                // if this is an array mapping then any query operators apply to the element mapping
                                resolvedMapping = (<ArrayMapping>resolvedMapping).elementMapping;
                            }
                            preparedValue = this._prepareQueryExpression(value, resolvedMapping);
                        }
                        else {
                            // Doesn't have any query operators so just write the value

                            if(resolvedMapping.flags & MappingFlags.Array) {
                                // if the mapping is an array we need to figure out if we are going to use the array
                                // mapping or the element mapping
                                var arrayMapping = (<ArrayMapping>resolvedMapping);
                                if(!Array.isArray(value) || (arrayMapping.nestedDepth > 1 && arrayMapping.nestedDepth > this._findArrayDepth(value))) {
                                    // use element mapping if the value is not an array OR we have nested arrays and
                                    // the depth of the nesting in the mapping is deeper than the depth in the value
                                    resolvedMapping = arrayMapping.elementMapping;
                                }
                            }

                            preparedValue = this._prepareQueryValue(context.resolvedPath, value, resolvedMapping);
                        }

                        preparedKey = context.resolvedPath;
                    }
                }

                (result || (result = {}))[preparedKey] = preparedValue;
            }
        }

        return result;
    }

    private _prepareQueryExpression(query: QueryDocument, mapping: Mapping): QueryDocument {

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
                    case '$gt':
                    case '$gte':
                    case '$lt':
                    case '$lte':
                    case '$ne':
                        // handle value
                        preparedValue = this._prepareQueryValue(key, value, mapping);
                        break;
                    case '$in':
                    case '$nin':
                    case '$all':
                        // handle array of values
                        if(!Array.isArray(value)) {
                            this.error = new Error("Expected array.");
                            return null;
                        }
                        preparedValue = new Array(value.length);
                        for(var i = 0, l = value.length; i < l; i++) {
                            preparedValue[i] = this._prepareQueryValue(key , value[i], mapping);
                        }
                        break;
                    case '$not':
                        // recursive expression
                        preparedValue = this._prepareQueryExpression(value, mapping);
                        break;
                    case '$elemMatch':
                        // recursive query document
                        preparedValue = this._prepareQueryDocument(value, mapping, /*withinField*/ true);
                        break;
                    case '$exists':
                    case '$type':
                    case '$mod':
                    case '$regex':
                    case '$geoIntersects':
                    case '$geoWithin':
                    case '$nearSphere':
                    case '$near':
                    case '$size':
                    case '$comment':
                        // assign as-is
                        preparedValue = value;
                        break;
                    default:
                        this.error = new Error("Unknown query operator '" + key + "'.");
                        return null;
                }

                result[key] = preparedValue;
            }
        }

        return result;
    }

    private _prepareQueryValue(path: string, value: any, mapping: Mapping): any {

        // Regular expressions are allowed in place of strings
        if((mapping.flags & MappingFlags.String) && (value instanceof RegExp)) {
            return RegExpUtil.clone(value);
        }

        var errors: MappingError[] = [];
        var preparedValue = mapping.write(value, path, errors, []);
        if(errors.length > 0) {
            this.error = new Error("Bad value: " + MappingError.createErrorMessage(errors));
            return null;
        }
        return preparedValue;
    }

    /**
     * Finds the maximum depth of nested arrays
     * @param value The value to check
     * @param depth The current depth. Default is 0.
     */
    private _findArrayDepth(value: any, depth = 0): number {

        if(value && Array.isArray(value)) {
            for (var i = 0, l = value.length; i < l; i++) {
                depth = Math.max(depth, this._findArrayDepth(value[i], depth + 1));
            }
        }

        return depth;
    }

    /**
     * Return true if the first property is a query operator; otherwise, return false. Query expressions won't mix
     * operator and non-operator fields like query documents can.
     * @param value The value to check.
     */
    private _isQueryExpression(value: any): boolean {

        if(typeof value === "object") {
            for (var key in value) {
                if(value.hasOwnProperty(key)) {
                    return key[0] == "$";
                }
            }
        }

        return false;
    }
}

export = CriteriaBuilder;