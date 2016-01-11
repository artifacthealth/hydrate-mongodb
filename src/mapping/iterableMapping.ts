import * as async from "async";
import {mapIterable} from "../core/async";
import {InternalMapping} from "./internalMapping";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {PropertyFlags} from "./propertyFlags";
import {InternalSession} from "../internalSession";
import {ResultCallback} from "../core/resultCallback";
import {EntityMapping} from "./entityMapping";
import {ResolveContext} from "./resolveContext";
import {TupleMapping} from "./tupleMapping";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";
import {Constructor} from "../core/constructor";

/**
 * Mapping for an iterable. The constructor passed to this mapping must take a single argument, an iterable, used to
 * constructor the iterable. Also, optionally, the prototype can include a 'size' property that indicates the size of
 * the iterable collection.
 */
// TODO: Combine Array and Iterable mappings? Note that array has a couple special cases including determining nested depth in query documents and that the Array constructor does not accept an iterable to construct it.
export class IterableMapping extends MappingBase {

    constructor(public iterableConstructor: Constructor<any>, public elementMapping: InternalMapping) {
        super(MappingFlags.Iterable);

        if(!iterableConstructor) {
            throw new Error("Missing required argument 'iterableConstructor");
        }

        if(!iterableConstructor.name) {
            throw new Error("Iterable constructor must have a name.");
        }
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if (!Array.isArray(value)) {
            context.addError("Expected array.");
            return;
        }

        // TODO: remove items scheduled for delete from array
        var arr = new Array(value.length),
            mapping = this.elementMapping;

        for (var i = 0, l = value.length; i < l; i++) {
            var item = value[i];

            // treat undefined values as null
            if (item === undefined) {
                item = null;
            }
            if (item === null) {
                arr[i] = null;
            }
            else {
                arr[i] = mapping.read(context, item);
            }
        }

        var result = new this.iterableConstructor(arr);

        // if there is an observer in the context, then watch this array for changes.
        if(context.observer) {
            context.observer.watch(result);
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(value == null) return null;

        if (!this._isIterable(value)) {
            errors.push({message: `Expected instance of ${this.iterableConstructor.name}.`, path: path, value: value});
        }

        var result = new Array(value.length),
            mapping = this.elementMapping,
            i = 0;

        for(let item of value) {
            // treat undefined values as null
            if (item === undefined) {
                item = null;
            }
            if (item === null) {
                item = null;
            }
            else {
                result[i++] = mapping.write(item, path, errors, visited);
            }
        }

        return result;
    }

    watch(value: any, observer: Observer, visited: any[]): void {

        if(!this._isIterable(value)) return;

        observer.watch(value);

        for(let item of value) {
            this.elementMapping.watch(item, observer, visited);
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


    walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!this._isIterable(value)) {
            return;
        }

        var mapping = this.elementMapping;
        for(let item of value) {
            mapping.walk(session, item, flags, entities, embedded, references);
        }
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if((!Array.isArray(value) && !this._isIterable(value)) || value.length === 0 || value.size === 0) {
            return callback(null, value);
        }

        mapIterable(value, (item, done) => this.elementMapping.fetch(session, parentEntity, item, path, depth, done), (err, result) => {
            if(err) return callback(err);
            callback(null, new this.iterableConstructor(result));
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

    private _isIterable(value: any): boolean {

        return value != null && value instanceof <any>this.iterableConstructor;
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
}
