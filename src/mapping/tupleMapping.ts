import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");

class TupleMapping extends MappingBase {

    constructor(public elementMappings: Mapping[]) {
        super(MappingFlags.Tuple);
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        if(!Array.isArray(value)) {
            errors.push({ message: "Expected tuple.", path: path, value: value });
            return;
        }

        var mappings = this.elementMappings;
        if(value.length != mappings.length) {
            errors.push({ message: "Expected " + mappings.length + " elements in tuple but source had " + value.length + ".", path: path, value: value });
            return;
        }

        var result = new Array(value.length);
        for (var i = 0, l = mappings.length; i < l; i++) {
            result[i] = mappings[i].read(session, value[i], path + "." + i, errors);
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(!Array.isArray(value)) {
            errors.push({ message: "Expected tuple.", path: path, value: value });
            return;
        }

        var mappings = this.elementMappings;
        if(value.length != mappings.length) {
            errors.push({ message: "Expected " + mappings.length + " elements in tuple but source had " + value.length + ".", path: path, value: value });
            return;
        }

        // TODO: treat undefined as null?

        var result = new Array(value.length);
        for (var i = 0, l = mappings.length; i < l; i++) {
            result[i] = mappings[i].write(value[i], path + "." + i, errors, visited);
        }

        return result;
    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // TODO: throw error if objectValue is not an array

        if (!Array.isArray(documentValue) || objectValue.length != documentValue.length) {

            (changes["$set"] || (changes["$set"] = {}))[path] = this.write(objectValue, path, [], []);
            return;
        }

        var mappings = this.elementMappings;
        for (var i = 0, l = mappings.length; i < l; i++) {
            var item = objectValue[i]

            // treat undefined values as null
            if(item === undefined) {
                item = null;
            }

            var documentItem = documentValue[i];

            if(item === documentItem) {
                continue;
            }

            // check for null value
            if(item === null) {
                (changes["$set"] || (changes["$set"] = {}))[path + "." + i] = null;
                continue;
            }

            // check if array element has changed
            mappings[i].compare(item, documentItem, changes, path + "." + i);
        }
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

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

            if(fieldValue1 !== fieldValue2 && !mappings[i].areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }


    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (value === null || value === undefined || !Array.isArray(value)) {
            return;
        }

        var mappings = this.elementMappings;
        for (var i = 0, l = Math.min(value.length, mappings.length); i < l; i++) {
            mappings[i].walk(value[i], flags, entities, embedded, references);
        }
    }
}

export = TupleMapping;