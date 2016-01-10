import {InternalMapping} from "./internalMapping";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {PropertyFlags} from "./propertyFlags";
import {InternalSession} from "../internalSession";
import {ResultCallback} from "../core/resultCallback";
import {ResolveContext} from "./resolveContext";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";

export class TupleMapping extends MappingBase {

    constructor(public elementMappings: InternalMapping[]) {
        super(MappingFlags.Tuple);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(!Array.isArray(value)) {
            context.addError("Expected tuple.");
            return;
        }

        var mappings = this.elementMappings;
        if(value.length != mappings.length) {
            context.addError("Expected " + mappings.length + " elements in tuple but source had " + value.length + ".");
            return;
        }

        var result = new Array(value.length);
        for (var i = 0, l = mappings.length; i < l; i++) {
            var savedPath = context.path;
            context.path += "." + i;
            result[i] = mappings[i].read(context, value[i]);
            context.path = savedPath;
        }

        // if there is an observer in the context, then watch this tuple for changes.
        if(context.observer) {
            context.observer.watch(result);
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(value == null) return null;

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

    watch(value: any, observer: Observer, visited: any[]): void {

        if(!value || !Array.isArray(value)) return;

        observer.watch(value);

        for (var i = 0, l = Math.min(value.length, this.elementMappings.length); i < l; i++) {
            this.elementMappings[i].watch(value[i], observer, visited);
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


    walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!Array.isArray(value)) {
            return;
        }

        var mappings = this.elementMappings;
        for (var i = 0, l = Math.min(value.length, mappings.length); i < l; i++) {
            mappings[i].walk(session, value[i], flags, entities, embedded, references);
        }
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!Array.isArray(value) || depth == path.length) {
            return callback(null, value);
        }

        var index = parseInt(path[depth]);
        if(index !== index || index < 0 || index >= this.elementMappings.length) {
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

    protected resolveCore(context: ResolveContext): void {

        var property = context.currentProperty;
        if(property == "$") {
            // this is the positional operator
            context.setError("Cannot resolve positional operator for Tuple.");
            return;
        }

        var index: number;
        if((index = parseInt(property)) === index) {
            // check if it's an array index
            if(index < 0 || index >= this.elementMappings.length) {
                context.setError("Index out of range for Tuple.");
                return;
            }

            var elementMapping = this.elementMappings[index];
            if(context.resolveProperty(elementMapping, property)) {
                return; // reached end of path
            }
            elementMapping.resolve(context);
        }
        else {
            context.setError("Expected index for Tuple.");
        }
    }
}
