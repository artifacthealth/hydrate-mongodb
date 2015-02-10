import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");

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

        if (!Array.isArray(value)) {
            return;
        }

        var mappings = this.elementMappings;
        for (var i = 0, l = Math.min(value.length, mappings.length); i < l; i++) {
            mappings[i].walk(value[i], flags, entities, embedded, references);
        }
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!Array.isArray(value) || depth == path.length) {
            return callback(null, value);
        }

        var index = parseInt(path[depth]);
        if(isNaN(index) || index < 0 || index >= this.elementMappings.length) {
            return callback(new Error("Undefined tuple index '" + path[depth] + "' in path '"+ path.join(".") + "'."));
        }

        var item = value[index];
        this.elementMappings[index].fetch(session, parentEntity, item, path, depth + 1, (err, result) => {
            if(err) return callback(err);
            if(item !== result) {
                value[index] = item;
            }
            callback(null, value);
        });
    }
}

export = TupleMapping;