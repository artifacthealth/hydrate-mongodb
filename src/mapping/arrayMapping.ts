import * as async from "async";
import {InternalMapping} from "./internalMapping";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {MappingModel} from "./mappingModel";
import {InternalSession} from "../sessionImpl";
import {ResultCallback} from "../core/callback";
import {EntityMapping} from "./entityMapping";
import {ResolveContext} from "./resolveContext";
import {TupleMapping} from "./tupleMapping";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export class ArrayMapping extends MappingBase {

    constructor(public elementMapping: InternalMapping) {
        super(MappingModel.MappingFlags.Array);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if (!Array.isArray(value)) {
            context.addError("Expected array.");
            return;
        }

        // TODO: remove items scheduled for delete from array
        var result = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            result[i] = mapping.read(context, value[i]);
        }

        // if there is an observer in the context, then watch this array for changes.
        if(context.observer) {
            context.observer.watch(result);
        }

        return result;
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if (!Array.isArray(value)) {
            context.addError("Expected array.");
            return;
        }

        var result = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            result[i] = mapping.write(context, value[i]);
        }

        return result;
    }

    watch(value: any, observer: Observer, visited: any[]): void {

        if(!value || !Array.isArray(value)) return;

        observer.watch(value);

        for (var i = 0, l = value.length; i < l; i++) {
            this.elementMapping.watch(value[i], observer, visited);
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

            if (fieldValue1 !== fieldValue2 && !mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }


    walk(session: InternalSession, value: any, flags: MappingModel.PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!Array.isArray(value)) {
            return;
        }

        var mapping = this.elementMapping;
        for (var i = 0, l = value.length; i < l; i++) {
            mapping.walk(session, value[i], flags, entities, embedded, references);
        }
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!Array.isArray(value) || value.length == 0) {
            return callback(null, value);
        }

        var mapping = this.elementMapping;
        async.map(value, (item, done) => mapping.fetch(session, parentEntity, item, path, depth, done), (err, result) => {
            if(err) return callback(err);
            callback(null, result);
        });
    }

    fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!parentEntity) {
            return callback(new Error("Parent entity required to resolve inverse relationship."));
        }

        if(!(this.elementMapping.flags & MappingModel.MappingFlags.Entity)) {
            return callback(new Error("Element mapping must be an entity to resolve inverse relationship."));
        }

        session.getPersister(<EntityMapping>this.elementMapping).findInverseOf(parentEntity, propertyName, (err, value) => {
            if(err) return callback(err);
            this.fetch(session, this, value, path, depth, callback);
        });
    }

    protected resolveCore(context: ResolveContext): void {

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

    private _findNestedDepth(depth: number, mapping: InternalMapping): number {

        if(mapping.flags & MappingModel.MappingFlags.Array) {
            return this._findNestedDepth(depth + 1, (<ArrayMapping>mapping).elementMapping);
        }
        else if (mapping.flags & MappingModel.MappingFlags.Tuple) {
            var elementMappings = (<TupleMapping>mapping).elementMappings;
            for(var i = 0, l = elementMappings.length; i < l; i++) {
                depth = Math.max(depth, this._findNestedDepth(depth + 1, elementMappings[i]));
            }
        }

        return depth;
    }

}
