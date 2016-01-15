import * as RegExpUtil from "../core/regExpUtil";
import {QueryDocument} from "./queryDocument";
import {ResolveContext} from "../mapping/resolveContext";
import {MappingFlags} from "../mapping/mappingFlags";
import {ArrayMapping} from "../mapping/arrayMapping";
import {InternalMapping} from "../mapping/internalMapping";
import {MappingError} from "../mapping/mappingError";
import {EntityMapping} from "../mapping/entityMapping";

/**
 * Class that builds a database query document.
 */
export class CriteriaBuilder {

    /**
     * The last error encounter by the CriteriaBuilder. The value is cleared before each build.
     */
    error: Error;


    constructor(protected mapping: EntityMapping) {

    }

    /**
     * Builds and validates a database query document
     * @param criteria The source query document.
     */
    build(criteria: QueryDocument): QueryDocument {

        this.error = undefined;

        var preparedCriteria = this.prepareQueryDocument(criteria, this.mapping);
        if(!preparedCriteria) {
            return null;
        }
        this.mapping.setQueryDocumentDiscriminator(preparedCriteria);
        return preparedCriteria;
    }

    protected prepareQueryDocument(query: QueryDocument, mapping?: InternalMapping, withinField?: boolean): QueryDocument {

        if(!query) return {};

        var result: QueryDocument = {};
        for(var key in query) {
            if(query.hasOwnProperty(key)) {
                var value = query[key],
                    preparedKey = key,
                    preparedValue = value;

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
                            arr[i] = this.prepareQueryDocument(value[i], mapping);
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
                        return this._prepareQueryExpression(key, query, mapping);
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
                            preparedValue = (<EntityMapping>this.mapping.inheritanceRoot).identity.fromString(value);
                        }
                        if(value == null || preparedValue == null) {
                            this.error = new Error("Missing or invalid identifier for '_id'.");
                            return null;                            
                        }
                    }
                    else {
                        // resolve field path
                        var context = mapping.resolve(key);
                        if(context.error) {
                            this.error = context.error;
                            return null;
                        }
                        var resolvedMapping = context.resolvedMapping;

                        if(this.isQueryExpression(value)) {
                            // Need to prepare the query expression

                            if(resolvedMapping.flags & MappingFlags.Array) {
                                // if this is an array mapping then any query operators apply to the element mapping
                                resolvedMapping = (<ArrayMapping>resolvedMapping).elementMapping;
                            }
                            preparedValue = this._prepareQueryExpression(key, value, resolvedMapping);
                        }
                        else {
                            // Doesn't have any query operators so just write the value

                            if(resolvedMapping.flags & MappingFlags.Array) {
                                // If the mapping is an array we need to figure out if we are going to use the array
                                // mapping or the element mapping. When querying against arrays you can pass a single
                                // element that will match if that element is in the array OR you can pass an array and
                                // the query will only match if you have an exact match on the array. If we support tuple
                                // and nested array mappings then the decision is unclear. That is what the logic below
                                // for. If we drop support for nested array mappings and tuples then we can get rid of
                                // this logic.
                                var arrayMapping = (<ArrayMapping>resolvedMapping);
                                if(!Array.isArray(value) || (arrayMapping.nestedDepth > 1 && arrayMapping.nestedDepth > this._findArrayDepth(value))) {
                                    // use element mapping if the value is not an array OR we have nested arrays and
                                    // the depth of the nesting in the mapping is deeper than the depth in the value
                                    resolvedMapping = arrayMapping.elementMapping;
                                }
                            }

                            preparedValue = this.prepareQueryValue(context.resolvedPath, value, resolvedMapping);
                        }

                        preparedKey = context.resolvedPath;
                    }
                }

                (result || (result = {}))[preparedKey] = preparedValue;
            }
        }

        return result;
    }

    private _prepareQueryExpression(operator: string, query: QueryDocument, mapping: InternalMapping): QueryDocument {

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
                    case '$gt':
                    case '$gte':
                    case '$lt':
                    case '$lte':
                    case '$ne':
                        // handle value
                        preparedValue = this.prepareQueryValue(key, value, mapping);
                        break;
                    case '$in':
                    case '$nin':
                    case '$all':
                        // handle array of values
                        preparedValue = this.prepareArrayOfValues(key, value, mapping);
                        break;
                    case '$not':
                        // recursive expression
                        preparedValue = this._prepareQueryExpression(key, value, mapping);
                        break;
                    case '$elemMatch':
                        // recursive query document
                        preparedValue = this.prepareQueryDocument(value, mapping, /*withinField*/ true);
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

    protected prepareArrayOfValues(operator: string, value: any[], mapping: InternalMapping): any[] {

        if(!Array.isArray(value)) {
            this.error = new Error("Expected array for '" + operator +"' operator.");
            return null;
        }

        var result = new Array(value.length);
        for(var i = 0, l = value.length; i < l; i++) {
            result[i] = this.prepareQueryValue(operator , value[i], mapping);
        }

        return result;
    }

    protected prepareQueryValue(path: string, value: any, mapping: InternalMapping): any {

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
    protected isQueryExpression(value: any): boolean {

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
