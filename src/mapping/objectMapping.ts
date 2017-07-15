import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingModel} from "./mappingModel";
import {Property} from "./property";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {InternalSession} from "../session";
import {ResultCallback} from "../core/callback";
import {ResolveContext} from "./resolveContext";
import {ClassMapping} from "./classMapping";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";
import {InternalMapping} from "./internalMapping";
import {WriteContext} from "./writeContext";
import {PersistenceError} from "../persistenceError";

/**
 * @hidden
 */
export class ObjectMapping extends MappingBase {

    properties: Property[] = [];
    private _propertiesByName: Map<string, Property> = new Map();
    private _propertiesByField: Map<string, Property> = new Map();

    constructor() {
        super(MappingModel.MappingFlags.Object | MappingModel.MappingFlags.Embeddable);
    }

    addProperty(property: Property): Property {

        if(!property) {
            throw new PersistenceError("Missing required argument 'property'.");
        }

        var error = this.validateProperty(property);
        if(error) {
            throw new PersistenceError(error);
        }

        this._propertiesByName.set(property.name, property);

        if(property.field) {
            this._propertiesByField.set(property.field, property);
        }

        this.properties.push(property);
        return property;
    }

    /**
     * Validates a property before adding it to the mapping. Returns any validation error messages or undefined if none.
     * @param property The property to validate.
     * @returns The error message.
     */
    validateProperty(property: Property): string {

        if(!property.name) {
            return "Property is missing 'name'.";
        }

        if(!property.field && !property.hasFlags(MappingModel.PropertyFlags.Ignored)) {
            return "Property must define a 'field' mapping if the property is not ignored.";
        }

        if (this._propertiesByName.has(property.name)) {
            return "There is already a mapped property with the name '" + property.name + "'.";
        }

        if (this._propertiesByField.has(property.field)) {
            return "There is already a mapped property for field '" + property.field + "'.";
        }
    }

    getProperty(name: string): Property {

        if(!name) {
            throw new PersistenceError("Missing required argument 'name'.");
        }

        return this._propertiesByName.get(name);
    }

    getPropertyForField(field: string): Property {

        return this._propertiesByField.get(field);
    }

    getProperties(flags?: MappingModel.PropertyFlags): Property[] {

        if (!flags) {
            return this.properties;
        }

        // TODO: cache search results

        var ret: Property[] = [];
        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            if ((property.flags & flags) !== 0) {
                ret.push(property)
            }
        }
        return ret;
    }

    read(context: ReadContext, value: any): any {

        return this.readObject(context, {}, value, /*checkRemoved*/ false);
    }

    protected readObject(context: ReadContext, obj: any, value: any, checkRemoved: boolean): any {

        if(value == null) {
            return null;
        }

        if(typeof value !== "object") {
            context.addError("Expected value to be an object.");
            return;
        }

        var base = context.path ? context.path + "." : "",
            properties = this.properties;

        var objectParent = context.parent;
        context.parent = obj;

        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            // todo: need to validate that the parent is assignable to the property
            // set the property value to the parent of the object if this is a parent reference
            if ((property.flags & MappingModel.PropertyFlags.Parent) != 0) {
                property.setPropertyValue(obj, objectParent);
                continue;
            }

            // skip fields that are not persisted
            if ((property.flags & (MappingModel.PropertyFlags.Ignored | MappingModel.PropertyFlags.InverseSide
                | MappingModel.PropertyFlags.WriteOnly)) != 0) {
                continue;
            }
            var fieldValue = property.getFieldValue(value),
                propertyValue: any = undefined;

            // skip undefined values
            if (fieldValue !== undefined) {
                // skip null values unless allowed
                if (fieldValue === null) {
                    if (property.nullable) {
                        propertyValue = null;
                    }
                }
                else {
                    var savedPath = context.path;
                    context.path = base + property.name;

                    if ((property.flags & MappingModel.PropertyFlags.FetchEager) != 0) {
                        context.addFetch(context.path);
                    }

                    propertyValue = property.mapping.read(context, fieldValue);
                    context.path = savedPath;
                }
            }

            if(propertyValue !== undefined) {
                property.setPropertyValue(obj, propertyValue);
            }
            else {
                // If the flag to check for removed properties is set, delete the property if the object has a value
                // but the document does not.
                if(checkRemoved && property.getPropertyValue(obj) !== undefined) {
                    // Deleting a property from an object causes the object to become non-optimized in V8. So we
                    // will just set the property value to undefined instead of deleting it. The resulting object is
                    // not exactly the same as if we had called delete but it's not worth the performance hit to
                    // call delete.
                    property.setPropertyValue(obj, undefined);
                }
            }
        }

        context.parent = objectParent;

        // if there is an observer in the context, then watch this object for changes.
        if(context.observer && (this.flags & MappingModel.MappingFlags.Immutable) == 0) {
            context.observer.watch(obj);
        }

        return obj;
    }

    write(context: WriteContext, value: any): any {

        return this.writeObject(context, {}, value);
    }

    protected writeObject(context: WriteContext, document: any, value: any): any {

        if(value == null) return null;

        var base = context.path ? context.path + "." : "",
            properties = this.properties,
            fieldValue: any;

        // TODO: Use Set for visited?
        if(this.flags & MappingModel.MappingFlags.Embeddable) {
            if (context.visited.indexOf(value) !== -1) {
                context.addError("Recursive reference of embedded object is not allowed.");
                return;
            }
            context.visited.push(value);
        }

        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i],
                flags = property.flags;

            // skip fields that are not persisted
            if ((flags & (MappingModel.PropertyFlags.Ignored | MappingModel.PropertyFlags.InverseSide)) != 0) {
                continue;
            }

            var propertyValue = property.getPropertyValue(value);
            if (propertyValue === undefined) {
                // skip undefined values
                continue;
            }
            if (propertyValue === null) {
                // skip null values unless allowed
                if (!property.nullable) {
                    continue;
                }
                fieldValue = null;
            }
            else {
                var savedPath = context.path;
                context.path = base + property.name;
                fieldValue = property.mapping.write(context, propertyValue);
                context.path = savedPath;
            }
            property.setFieldValue(document, fieldValue);
        }

        context.visited.pop();

        return document;
    }

    watch(value: any, observer: Observer, visited: any[]): void {

        if(!value || typeof value != "object") return;

        if(this.flags & MappingModel.MappingFlags.Embeddable) {
            if (visited.indexOf(value) !== -1) return;
            visited.push(value);
        }

        observer.watch(value);

        for (var i = 0, l = this.properties.length; i < l; i++) {

            var property = this.properties[i];
            // if the property is not ignored and it has the specified flags, then walk the value of the property
            if ((property.flags & MappingModel.PropertyFlags.Ignored) == 0) {
                property.mapping.watch(property.getPropertyValue(value), observer, visited);
            }
        }
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if(documentValue1 === documentValue2) return true;
        if(documentValue1 == null || documentValue2 == null) return false;

        if (typeof documentValue1 !== "object" || typeof documentValue2 !== "object") {
            return false;
        }

        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            // skip fields that are not persisted
            if ((property.flags & (MappingModel.PropertyFlags.Ignored | MappingModel.PropertyFlags.InverseSide)) != 0) {
                continue;
            }

            // get the field values from the documents
            var fieldValue1 = property.getFieldValue(documentValue1);
            var fieldValue2 = property.getFieldValue(documentValue2);

            if (fieldValue1 !== fieldValue2 && !property.mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }

    walk(session: InternalSession, value: any, flags: MappingModel.PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!value || typeof value !== "object") return;

        if(this.flags & MappingModel.MappingFlags.Embeddable) {
            if (embedded.indexOf(value) !== -1) return;
            embedded.push(value);
        }

        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            // if the property is not ignored and it has the specified flags, then walk the value of the property
            if ((property.flags & MappingModel.PropertyFlags.Ignored) == 0
                && ((property.flags & flags) != 0 || ((flags & MappingModel.PropertyFlags.All) == 0))) {

                property.mapping.walk(session, property.getPropertyValue(value), flags, entities, embedded, references);
            }
        }
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!value || typeof value !== "object" || depth == path.length) {
            return callback(null, value);
        }

        var property = this.getProperty(path[depth]);
        if (property === undefined) {
            return callback(new PersistenceError("Undefined property '" + path[depth] + "' in path '"+ path.join(".") + "'."));
        }

        // TODO: In mapping validation, throw error if object that holds inverse side of relationship is not an entity

        var propertyValue = property.getPropertyValue(value);
        if((property.flags & MappingModel.PropertyFlags.InverseSide) != 0 && propertyValue === undefined) {
            property.mapping.fetchInverse(session, parentEntity, property.inverseOf, path, depth + 1, handleCallback);
        }
        else if((property.flags & MappingModel.PropertyFlags.FetchLazy) != 0 && propertyValue === undefined) {
            this.fetchPropertyValue(session, value, property, handleCallback);
        }
        else {
            property.mapping.fetch(session, parentEntity, propertyValue, path, depth + 1, handleCallback);
        }

        function handleCallback(err: Error, result: any) {
            if(err) return callback(err);

            if(propertyValue !== result) {
                property.setPropertyValue(value, result);
            }

            callback(null, value);
        }
    }

    protected fetchPropertyValue(session: InternalSession, value: any, property: Property, callback: ResultCallback<any>): void {

        // property values should be fully fetched on all non-entity types.
        callback(null, property.getPropertyValue(value));
    }

    protected resolveCore(context: ResolveContext): void {

        var property = this.getProperty(context.currentProperty);
        if (property === undefined) {
            if((this.flags & MappingModel.MappingFlags.Class) != 0) {
                context.setError("Undefined property for class '" + (<any>this).name +"'.");
            }
            else {
                context.setError("Undefined property.");
            }
            return;
        }

        if((property.flags & MappingModel.PropertyFlags.Parent) != 0) {
            context.setError("Cannot resolve parent reference.");
        }
        else if((property.flags & MappingModel.PropertyFlags.InverseSide) != 0) {
            context.setError("Cannot resolve inverse side of relationship.");
        }
        else if((property.flags & MappingModel.PropertyFlags.Ignored) != 0) {
            context.setError("Cannot resolve ignored property.");
        }

        if(context.resolveProperty(property.mapping, property.field)) {
            return; // reached end of path
        }

        property.mapping.resolve(context);
    }
}
