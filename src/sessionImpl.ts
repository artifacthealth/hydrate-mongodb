/// <reference path="../typings/tsreflect.d.ts" />
/// <reference path="../typings/async.d.ts" />

import reflect = require("tsreflect");
import async = require("async");
import Callback = require("./callback");
import ChangeTracking = require("./mapping/changeTracking");
import CollectionTable = require("./driver/collectionTable");
import Constructor = require("./constructor");
import DocumentBuilder = require("./persister/documentBuilder");
import DocumentPersister = require("./persister/documentPersister");
import LockMode = require("./lockMode");
import Identifier = require("./id/identifier");
import IteratorCallback = require("./iteratorCallback");
import Map = require("./map");
import MappingRegistry = require("./mapping/mappingRegistry");
import ObjectBuilder = require("./persister/objectBuilder");
import PropertyFlags = require("./mapping/propertyFlags");
import ResultCallback = require("./resultCallback");
import InternalSession = require("./internalSession");
import SessionFactory = require("./sessionFactory");
import TypeMapping = require("./mapping/typeMapping");
import TypeMappingFlags = require("./mapping/typeMappingFlags");

enum ObjectState {

    /**
     * Managed entities have a persistent identity and are associated with a session.
     */
    Managed,

    /**
     * Detached entities have a persistent identity and are not currently associated with a session.
     */
    Detached,

    /**
     * Removed entities  have a persistent identity, are associated with a session, and are scheduled for deletion
     * from the mongodb. Once the entity is deleted from the mongodb, it is considered a new entity.
     */
    Removed
}

enum Operation {

    None = 0,
    Insert,
    Update,
    Delete,
    DirtyCheck
}

enum ObjectFlags {

    None = 0,
    ReadOnly = 0x00000001
}

interface Reference {
    mapping: TypeMapping;
    id: Identifier;
}

// TODO: option to use weak reference until object is removed or modified and attach event to unlink if garbage collected? https://github.com/TooTallNate/node-weak
interface ObjectLinks {

    state: ObjectState;
    scheduledOperation: Operation;
    object: any;
    originalDocument?: any;
    mapping: TypeMapping;
}

// TODO: read-only query results, read-only annotation for classes, raise events on UnitOfWork
class SessionImpl implements InternalSession {

    private _collections: CollectionTable;
    private _mappingRegistry: MappingRegistry;
    private _objectLinks: Map<ObjectLinks> = {};
    private _objectBuilder: ObjectBuilder;
    private _documentBuilder: DocumentBuilder;

    constructor(sessionFactory: SessionFactory) {

        this._collections = sessionFactory.collections;
        this._mappingRegistry = sessionFactory.mappingRegistry;
        this._objectBuilder = new ObjectBuilder(this._mappingRegistry);
        this._documentBuilder = new DocumentBuilder(this._mappingRegistry);
    }

    save(obj: any, callback: Callback): void {

        this._findReferencedEntities(obj, PropertyFlags.CascadeSave, (err, entities) => {
            if(err) return callback(err);
            this._saveEntities(entities, callback);
        });
    }

    private _saveEntities(entities: any[], callback: Callback): void {

        for(var i = 0, l = entities.length; i < l; i++) {
            var obj = entities[i];
            var links = this._getObjectLinks(obj);
            if (!links) {
                var mapping = this._mappingRegistry.getMappingForObject(obj);
                if (!mapping) {
                    callback(new Error("Object is not mapped as a document type."));
                    return;
                }

                // we haven't seen this object before
                obj["_id"] = mapping.root.identityGenerator.generate();
                this._linkObject(obj, mapping, Operation.Insert);
            }
            else {
                switch (links.state) {
                    case ObjectState.Managed:
                        if (links.mapping.root.changeTracking == ChangeTracking.DeferredExplicit && !links.scheduledOperation) {
                            links.scheduledOperation = Operation.DirtyCheck;
                        }
                        break;
                    case ObjectState.Detached:
                        callback(new Error("Cannot save a detached object."));
                        return;
                    case ObjectState.Removed:
                        // Cancel delete operation and make managed.
                        links.scheduledOperation = Operation.None;
                        links.state = ObjectState.Managed;
                        break;
                }
            }
        }

        callback();
    }

    remove(obj: any, callback: Callback): void {

        this._findReferencedEntities(obj, PropertyFlags.CascadeRemove | PropertyFlags.Dereference, (err, entities) => {
            if(err) return callback(err);
            this._removeEntities(entities, callback);
        });
    }

    private _removeEntities(entities: any[], callback: Callback): void {

        // remove in reverse order
        for(var i = entities.length - 1; i >= 0; i--) {
            var obj = entities[i];

            var links = this._getObjectLinks(obj);
            if (links) {
                switch (links.state) {
                    case ObjectState.Managed:
                        // if the object has never been persisted then unlink the object and clear it's id
                        if (links.scheduledOperation == Operation.Insert) {
                            this._unlinkObject(links);
                        }
                        else {
                            links.scheduledOperation = Operation.Delete;
                            links.state = ObjectState.Removed;
                            // TODO: after successful delete operation, unlink the object and clear the object's identifier
                        }
                        break;
                    case ObjectState.Detached:
                        callback(new Error("Cannot remove a detached object."));
                        return;
                }
            }
        }

        callback();
    }

    detach(obj: any, callback: Callback): void {

        this._findReferencedEntities(obj, PropertyFlags.CascadeDetach, (err, entities) => {
            if(err) return callback(err);
            this._detachEntities(entities, callback);
        });
    }

    private _detachEntities(entities: any[], callback: Callback): void {

        for(var i = 0, l = entities.length; i < l; i++) {
            var links = this._getObjectLinks(entities[i]);
            if (links && links.state == ObjectState.Managed) {
                this._unlinkObject(links);
            }
        }

        callback();
    }

    // TODO: make callback optional on operations (e.g. persist, etc.) and throw error during flush if callback was not provided to operation
    // TODO: wait for any pending operations (e.g. persist, etc.) to complete before flush is executed
    // TODO: if flush is executing, delay any operations (e.g. persist, etc.) until after flush has completed
    // TODO: if flush fails, mark session invalid and don't allow any further operations?
    // TODO: if operations fails (e.g. persist, etc.) should session become invalid?
    flush(callback: Callback): void {

        // Get all list of all object links. A for-in loop is slow so build a list from the map since we are going
        // to have to iterate through the list several times.
        var list = this._getAllObjectLinks();

        for(var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            // TODO: ignore read-only objects
            // do a dirty check if the object is scheduled for dirty check or the change tracking is deferred implicit and the object is not scheduled for anything else
            if (links.scheduledOperation == Operation.DirtyCheck || (links.mapping.root.changeTracking == ChangeTracking.DeferredImplicit && !links.scheduledOperation)) {
                var document = this._documentBuilder.buildDocument(links.object, links.mapping.type);
            }
        }

        // MongoDB bulk operations need to be ordered by operation type or they are not executed
        // as bulk operations. The DocumentPersister will group operations by collection but will not reorder them.
        var persister = new DocumentPersister(this._collections, this._documentBuilder);

        // Add all inserts
        for (var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            if (links.scheduledOperation == Operation.Insert) {
                persister.addInsert(links.object, links.mapping);
            }
        }

        // Add all updates
        for (var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            if (links.scheduledOperation == Operation.Update) {
                persister.addUpdate(links.object, links.mapping);
            }
        }

        // Add all deletes
        for (var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            if (links.scheduledOperation == Operation.Delete) {
                persister.addDelete(links.object, links.mapping);
            }
        }

        // TODO: what to do if we get an error during execute? Should we make the session invalid?
        persister.execute(err => {
            if(err) return callback(err);

            // clear any scheduled operations
            for (var i = 0, l = list.length; i < l; i++) {
                list[i].scheduledOperation = Operation.None;
            }
            callback();
        });
    }

    find<T>(ctr: Constructor<T>, id: string, callback: ResultCallback<T>): void {

        // check to see if object is already loaded
        var links = this._getObjectLinksById(id);
        if (links) {
            return done(null, links.object);
        }

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if (!mapping) {
            return done(new Error("Object is not mapped as a document type."));
        }

        this._findInCollection(mapping, mapping.root.identityGenerator.fromString(id), callback);

        function done(err: Error, result?: T) {
            process.nextTick(() => {
                callback(err, result);
            });
        }
    }

    clear(): void {

        this._objectLinks = {};
    }

    getIdentifier(obj: any): Identifier {

        return obj["_id"];
    }


    private _findInCollection(mapping: TypeMapping, id: Identifier, callback: ResultCallback<any>): void {

        this._collections[mapping.root.id].findOne({ _id: id }, (err, document) => {
            if (err) return callback(err);
            this._load(mapping, document, callback);
        });
    }

    // only call within async function
    private _load<T>(mapping: TypeMapping, document: any, callback: ResultCallback<T>): void {

        // if the document is null or undefined then return undefined
        if (!document) {
            // note that we are not ensuring the callback is called async because _load will only
            // be called within an async function
            return callback(null);
        }

        // check to see if object is already loaded
        var links = this._getObjectLinksById(document["_id"]);
        if (links) {
            return callback(null, links.object);
        }

        var obj = this._objectBuilder.buildObject(document, mapping.type);
        var links = this._linkObject(obj, mapping);
        // save the original document for dirty checking
        links.originalDocument = document;

        callback(null, obj);
    }

    private _getObjectLinksById(id: Identifier): ObjectLinks {

        return this._objectLinks[id.toString()];
    }

    /**
     * Returns all linked objected as an array.
     */
    private _getAllObjectLinks(): ObjectLinks[] {

        var ret: ObjectLinks[] = [];

        var objectLinks = this._objectLinks;
        for (var id in objectLinks) {
            if (objectLinks.hasOwnProperty(id)) {
                ret.push(objectLinks[id]);
            }
        }

        return ret;
    }

    private _getObjectLinks(obj: any): ObjectLinks {

        var id = obj["_id"];
        if (id) {
            var links = this._objectLinks[id.toString()];
            if (!links) {
                // If we have an id but no links then the object must be detached since we assume that we manage
                // the assignment of the identifier.
                var mapping = this._mappingRegistry.getMappingForObject(obj);
                if (!mapping) return;

                links = this._linkObject(obj, mapping);
                links.state = ObjectState.Detached;
            }
            return links;
        }
    }

    private _linkObject(obj: any, mapping: TypeMapping, operation = Operation.None): ObjectLinks {

        var links = {
            state: ObjectState.Managed,
            scheduledOperation: operation,
            object: obj,
            mapping: mapping
        }

        return this._objectLinks[obj["_id"].toString()] = links;
    }

    private _unlinkObject(links: ObjectLinks): void {

        delete this._objectLinks[links.object["_id"].toString()];

        // if the object was never persisted or if it has been removed, then clear it's identifier as well
        if (links.scheduledOperation == Operation.Insert || links.state == ObjectState.Removed) {
            this._clearIdentifier(links.object);
        }
    }

    private _clearIdentifier(obj: any): void {

        delete obj["_id"];
    }

    private _findReferencedEntities(obj: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {

        var mapping = this._mappingRegistry.getMappingForObject(obj);
        if (!mapping) {
            done(new Error("Object is not mapped as a document type."));
        }

        var entities: any[] = [],
            embedded: any[] = [];
        this._walkEntity(obj, mapping, flags, entities, embedded, err => {
            if(err) return done(err);
            done(null, entities);
        });

        function done(err: Error, results?: any[]) {
            process.nextTick(() => {
                callback(err, results);
            });
        }
    }

    private _walkEntity(entity: any, mapping: TypeMapping, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        this._walkValue(entity, mapping.type, flags, entities, embedded, references);

        // TODO: load references in batches grouped by root mapping
        async.each(references, (reference: Reference, done: (err?: Error) => void) => {
            this._findInCollection(reference.mapping, reference.id, (err: Error, entity: any) => {
                if (err) return done(err);
                this._walkEntity(entity, reference.mapping, flags, entities, embedded, callback);
            });
        }, err => callback(err));
    }

    private _walkValue(value: any, type: reflect.Type, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (value === null || value === undefined) return;

        if (type.isTuple()) {
            if (Array.isArray(value)) {
                var elementTypes = type.getElementTypes();
                for (var i = 0, l = Math.min(value.length, elementTypes.length); i < l; i++) {
                    this._walkValue(value[i], elementTypes[i], flags, entities, embedded, references);
                }
            }
            return;
        }

        if (type.isArray()) {
            if (Array.isArray(value)) {
                var elementType = type.getElementType();
                for (i = 0, l = value.length; i < l; i++) {
                    this._walkValue(value[i], elementType, flags, entities, embedded, references);
                }
            }
            return;
        }

        if (type.isObjectType()) {
            // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
            // does not exist, default to mapping for type.
            var mapping = this._mappingRegistry.getMappingForObject(value) || this._mappingRegistry.getMappingForType(type);
            if (!mapping) return;

            if (mapping.flags & TypeMappingFlags.DocumentType) {
                // TODO: handle DBRef
                if(!(value instanceof mapping.classConstructor)) {
                    // if the entity is not an instance of the entity's constructor then it should be an identifier or DBRef
                    var links = this._getObjectLinksById(value);
                    if (links) {
                        value = links.object;
                    }
                    else {
                        if(flags & PropertyFlags.Dereference) {
                            // store reference to resolve later
                            references.push({mapping: mapping, id: value});
                        }
                        return;
                    }
                }
                if (entities.indexOf(value) !== -1) return;
                entities.push(value);
            }
            else {
                if (embedded.indexOf(value) !== -1) return;
                embedded.push(value);
            }

            var properties = mapping.properties;
            for (var i = 0, l = properties.length; i < l; i++) {
                var property = properties[i];
                // if the property is not ignored and it has the specified flags, then walk the value of the property
                if (!(property.flags & PropertyFlags.Ignored) && (property.flags & flags)) {
                    this._walkValue(property.symbol.getValue(value), property.symbol.getType(), flags, entities, embedded, references);
                }
            }
        }
    }
}

export = SessionImpl;