import QueryDocument = require("./queryDocument");
import ResolveContext = require("../mapping/resolveContext");
import MappingFlags = require("../mapping/mappingFlags");
import ArrayMapping = require("../mapping/arrayMapping");
import Mapping = require("../mapping/mapping");
import MappingError = require("../mapping/mappingError");
import RegExpUtil = require("../core/regExpUtil");
import EntityMapping = require("../mapping/entityMapping");

class UpdateDocumentBuilder {

    private _mapping: EntityMapping;

    /**
     * The last error encounter by the CriteriaBuilder. The value is cleared before each build.
     */
    error: Error;


    constructor(mapping: EntityMapping) {

        this._mapping = mapping;
    }

    build(updateDocument: QueryDocument): QueryDocument {

        this.error = undefined;
        if(!updateDocument) return updateDocument;

        var result: QueryDocument = {};
        for(var key in updateDocument) {
            if (updateDocument.hasOwnProperty(key)) {
                if (key[0] != "$") {
                    // all top-level keys in an update document should be operators or this is a replacement document
                    return this._prepareQueryValue("", updateDocument, this._mapping);
                }
                var value = updateDocument[key],
                    preparedValue: any;

                switch (key) {
                    case '$currentDate':
                    case '$inc':
                    case '$max':
                    case '$min':
                    case '$mul':
                    case '$rename':
                    case '$setOnInsert':
                    case '$set':
                    case '$unset':
                    case '$addToSet':
                    case '$pop':
                    case '$pullAll':
                    case '$pull':
                    case '$pushAll':
                    case '$push':
                    case 'bit':
                        break;
                    default:
                        this.error = new Error("Unknown query operator '" + key + "'.");
                        return null;
                }
            }
        }
    }

    /*
     currentDate     { $currentDate: { <field1>: <typeSpecification1>, ... } }
     inc             { $inc: { <field1>: <amount1>, <field2>: <amount2>, ... } }
     max             { $max: { <field1>: <value1>, ... } }
     min             { $min: { <field1>: <value1>, ... } }
     mul             { $mul: { field: <number> } }
     rename          { $rename: { <field1>: <newName1>, <field2>: <newName2>, ... } }
     setOnInsert     { $setOnInsert: { <field1>: <value1>, ... } }  // on for upsert
     set             { $set: { <field1>: <value1>, ... } }
     unset           { $unset: { <field1>: "", ... } }


     Array operators

     $               { "<array>.$" : value }
     addToSet        { $addToSet: { <field1>: <value1>, ... } }
     pop             { $pop: { <field>: <-1 | 1>, ... } }
     pullAll         { $pullAll: { <field1>: [ <value1>, <value2> ... ], ... } }
     pull            { $pull: { <field1>: <value|query>, ... } }
     pushAll         { $pushAll: { <field>: [ <value1>, <value2>, ... ] } }
     push            { $push: { <field1>: <value1>, ... }


     Modifiers

     each            { $addToSet: { <field>: { $each: [ <value1>, <value2> ... ] } } }
     each            { $push: { <field>: { $each: [ <value1>, <value2> ... ] } } }
     position        { $push: { <field>: { $each: [ <value1>, <value2>, ... ], $position: <num> } }}
     slice           { $push: { <field>: { $each: [ <value1>, <value2>, ... ], $slice: <num> }}}
     sort            { $push: { <field>: { $each: [ <value1>, <value2>, ... ], $sort: <sort specification> }}}


     Bitwise

     bit             { $bit: { <field1>: { <and|or|xor>: <int> }, ... } }

     */

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

export = UpdateDocumentBuilder;