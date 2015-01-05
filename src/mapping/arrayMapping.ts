import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");

class ArrayMapping extends MappingBase {

    constructor(public elementMapping: Mapping) {
        super(MappingFlags.Array);
    }

    read(value: any, path: string, errors: MappingError[]): any {

        if(!Array.isArray(value)) {
            errors.push({ message: "Expected array.", path: path, value: value });
            return;
        }

        var result = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];

            // treat undefined values as null
            if(item === undefined) {
                item = null;
            }
            result[i] = mapping.read(item, path, errors);
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(!Array.isArray(value)) {
            errors.push({ message: "Expected array.", path: path, value: value });
        }

        var result = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];

            // treat undefined values as null
            if(item === undefined) {
                item = null;
            }
            result[i] = mapping.write(item, path, errors, visited);
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

        var mapping = this.elementMapping;
        for (var i = 0, l = objectValue.length; i < l; i++) {
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
            mapping.compare(item, documentItem, changes, path + "." + i);
        }
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (!Array.isArray(documentValue1) || !Array.isArray(documentValue2) || documentValue1.length != documentValue2.length) {
            return false;
        }

        var mapping = this.elementMapping;
        for (var i = 0, l = documentValue1.length; i < l; i++) {
            // get the field values from the documents
            var fieldValue1 = documentValue1[i];
            var fieldValue2 = documentValue2[i];

            if(fieldValue1 !== fieldValue2 && !mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }
}

export = ArrayMapping;