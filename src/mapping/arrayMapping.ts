import Async = require("../core/async");
import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");
import EntityMapping = require("./entityMapping");
import ResolveContext = require("./resolveContext");
import TupleMapping = require("./tupleMapping");

class ArrayMapping extends MappingBase {

    constructor(public elementMapping: Mapping) {
        super(MappingFlags.Array);
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        if (!Array.isArray(value)) {
            errors.push({message: "Expected array.", path: path, value: value});
            return;
        }

        // TODO: remove items scheduled for delete from array

        var result = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];

            // treat undefined values as null
            if (item === undefined) {
                item = null;
            }
            result[i] = mapping.read(session, item, path, errors);
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if (!Array.isArray(value)) {
            errors.push({message: "Expected array.", path: path, value: value});
        }

        var result = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];

            // treat undefined values as null
            if (item === undefined) {
                item = null;
            }
            result[i] = mapping.write(item, path, errors, visited);
        }

        return result;
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

            if (fieldValue1 !== fieldValue2 && !mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }


    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!Array.isArray(value)) {
            return;
        }

        var mapping = this.elementMapping;
        for (var i = 0, l = value.length; i < l; i++) {
            mapping.walk(value[i], flags, entities, embedded, references);
        }
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!Array.isArray(value) || value.length == 0) {
            return callback(null, value);
        }

        // TODO: warn in documentation that if array is modified before this callback returns then results are unpredictable
        var mapping = this.elementMapping;
        Async.forEach(value, (item, index, done) => {
            // note, depth is not incremented for array
            mapping.fetch(session, parentEntity, item, path, depth, (err, result) => {
                if(err) return done(err);
                if(item !== result) {
                    value[index] = result;
                }
                done();
            });
        }, (err) => {
            if(err) return callback(err);
            callback(null, value);
        });
    }

    fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!parentEntity) {
            return callback(new Error("Parent entity required to resolve inverse relationship."));
        }

        if(!(this.elementMapping.flags & MappingFlags.Entity)) {
            return callback(new Error("Element mapping must be an entity to resolve inverse relationship."));
        }

        session.getPersister(<EntityMapping>this.elementMapping).findInverseOf(parentEntity, propertyName, (err, value) => {
            if(err) return callback(err);
            this.fetch(session, this, value, path, depth, callback);
        });
    }

    _resolveCore(context: ResolveContext): void {

        var property = context.currentProperty,
            index: number;

        if(property == "$" || ((index = parseInt(property)) === index)) {
            // this is the positional operator or an index
            if(context.resolveProperty(this.elementMapping, property)) {
                return; // reached end of path
            }
        }

        this.elementMapping.resolve(context);
    }

    private _nestedDepth: number;

    /**
     * Gets the maximum depth of nested array and tuple mappings
     */
    get nestedDepth(): number {
        if(this._nestedDepth !== undefined) {
            this._nestedDepth = this._findNestedDepth(0, this);
        }
        return this._nestedDepth;
    }

    private _findNestedDepth(depth: number, mapping: Mapping): number {

        if(mapping.flags & MappingFlags.Array) {
            return this._findNestedDepth(depth + 1, (<ArrayMapping>mapping).elementMapping);
        }
        else if (mapping.flags & MappingFlags.Tuple) {
            var elementMappings = (<TupleMapping>mapping).elementMappings;
            for(var i = 0, l = elementMappings.length; i < l; i++) {
                depth = Math.max(depth, this._findNestedDepth(depth + 1, elementMappings[i]));
            }
        }

        return depth;
    }

}

export = ArrayMapping;


