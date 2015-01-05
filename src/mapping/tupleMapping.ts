import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");

class TupleMapping extends MappingBase {

    constructor(public elementMappings: Mapping[]) {
        super(MappingFlags.Tuple);
    }

    read(value: any, path: string, errors: MappingError[]): any {

        if(!Array.isArray(value)) {
            errors.push({ message: "Expected tuple.", path: path, value: value });
            return;
        }

        var elementMappings = this.elementMappings;
        if(value.length != elementMappings.length) {
            errors.push({ message: "Expected " + elementMappings.length + " elements in tuple but source had " + value.length + ".", path: path, value: value });
            return;
        }

        var result = new Array(value.length);
        for (var i = 0, l = elementMappings.length; i < l; i++) {
            result[i] = elementMappings[i].read(value[i], path + "." + i, errors);
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(!Array.isArray(value)) {
            errors.push({ message: "Expected tuple.", path: path, value: value });
            return;
        }

        var elementMappings = this.elementMappings;
        if(value.length != elementMappings.length) {
            errors.push({ message: "Expected " + elementMappings.length + " elements in tuple but source had " + value.length + ".", path: path, value: value });
            return;
        }

        // TODO: treat undefined as null?

        var result = new Array(value.length);
        for (var i = 0, l = elementMappings.length; i < l; i++) {
            result[i] = elementMappings[i].write(value[i], path + "." + i, errors, visited);
        }

        return result;
    }

    walk(value: any, path: string): void {

    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // TODO: throw error if objectValue is not an array

        if (!Array.isArray(documentValue) || objectValue.length != documentValue.length) {

            (changes["$set"] || (changes["$set"] = {}))[path] = this.write(objectValue, path, [], []);
            return;
        }

        var elementMappings = this.elementMappings;
        for (var i = 0, l = elementMappings.length; i < l; i++) {
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
            elementMappings[i].compare(item, documentItem, changes, path + "." + i);
        }
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (!Array.isArray(documentValue1) || !Array.isArray(documentValue2) || documentValue1.length != documentValue2.length) {
            return false;
        }

        var elementMappings = this.elementMappings;
        if (documentValue1.length != elementMappings.length) {
            return false;
        }

        for (var i = 0, l = elementMappings.length; i < l; i++) {
            // get the field values from the documents
            var fieldValue1 = documentValue1[i];
            var fieldValue2 = documentValue2[i];

            if(fieldValue1 !== fieldValue2 && !elementMappings[i].areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }
}

export = TupleMapping;