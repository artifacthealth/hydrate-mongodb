/// <reference path="../typings/async.d.ts" />

import async = require("async");
import Callback = require("./core/callback");
import ChangeTracking = require("./mapping/changeTracking");
import Constructor = require("./core/constructor");
import LockMode = require("./lockMode");
import Identifier = require("./id/identifier");
import IteratorCallback = require("./core/iteratorCallback");
import Map = require("./core/map");
import PropertyFlags = require("./mapping/propertyFlags");
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import InternalSessionFactory = require("./internalSessionFactory");
import EntityMapping = require("./mapping/entityMapping");
import TaskQueue = require("./taskQueue");
import EntityPersister = require("./persister/entityPersister");
import Batch = require("./persister/batch");

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
     * Removed entities have a persistent identity, are associated with a session, and are scheduled for deletion
     * from the mongodb. Once the entity is deleted from the mongodb, the entity is no longer managed and is
     * considered a new entity.
     */
    Removed
}

enum ObjectFlags {

    None = 0,
    ReadOnly = 0x00000001
}

enum Action {

    Save = 0x00000001,
    Remove = 0x00000002,
    Detach = 0x00000004,
    Flush = 0x00000008,
    Find = 0x00000010,
    Clear = 0x00000020,

    SaveWaits = Action.Remove | Action.Detach | Action.Flush,
    RemoveWaits = Action.Save | Action.Detach | Action.Flush,
    DetachWaits = Action.Save | Action.Remove | Action.Flush,
    FlushWaits = Action.Save |Action.Remove | Action.Detach | Action.Flush
}

enum ScheduledOperation {

    None = 0,
    Insert,
    Update,
    Delete,
    DirtyCheck
}

interface Reference {
    mapping: EntityMapping;
    id: Identifier;
}

// TODO: option to use weak reference until object is removed or modified and attach event to unlink if garbage collected? https://github.com/TooTallNate/node-weak
interface ObjectLinks {

    state: ObjectState;
    scheduledOperation: ScheduledOperation;
    object: any;
    originalDocument?: any;
    persister: EntityPersister;
}

// TODO: read-only query results
// TODO: raise events on UnitOfWork
class SessionImpl implements InternalSession {

    private _objectLinks: Map<ObjectLinks> = {};
    private _queue: TaskQueue;

    constructor(public factory: InternalSessionFactory) {

        this._queue = new TaskQueue(this._execute.bind(this));
    }

    save(obj: any, callback?: Callback): void {

        this._queue.add(Action.Save, Action.SaveWaits, obj, callback);
    }

    remove(obj: any, callback?: Callback): void {

        this._queue.add(Action.Remove, Action.RemoveWaits, obj, callback);
    }

    detach(obj: any, callback: Callback): void {

        this._queue.add(Action.Detach, Action.DetachWaits, obj, callback);
    }

    // TODO: if flush fails, mark session invalid and don't allow any further operations?
    // TODO: if operations fails (e.g. save, etc.) should session become invalid? Perhaps have two classes of errors, those that cause the session to become invalid and those that do not?
    flush(callback?: Callback): void {

        this._queue.add(Action.Flush, Action.FlushWaits, undefined, callback);
    }

    private _execute(action: Action, arg: any, callback: ResultCallback<any>): void {

        switch(action) {
            case Action.Save:
                this._save(arg, callback);
                break;
            case Action.Remove:
                this._remove(arg, callback);
                break;
            case Action.Detach:
                this._detach(arg, callback);
                break;
            case Action.Flush:
                this._flush(callback);
                break;
        }
    }

    private _save(obj: any, callback: Callback): void {

        this._referencedEntities(obj, PropertyFlags.CascadeSave, (err, entities) => {
            if(err) return callback(err);
            this._saveEntities(entities, callback);
        });
    }

    private _saveEntities(entities: any[], callback: Callback): void {

        for(var i = 0, l = entities.length; i < l; i++) {
            var obj = entities[i];
            var links = this._getObjectLinks(obj);
            if (!links) {
                var persister = this.factory.getPersisterForObject(obj);
                if (!persister) {
                    callback(new Error("Object type is not mapped as an entity."));
                    return;
                }

                // we haven't seen this object before
                obj["_id"] = persister.identity.generate();
                this._linkObject(obj, persister, ScheduledOperation.Insert);
            }
            else {
                switch (links.state) {
                    case ObjectState.Managed:
                        if (links.persister.changeTracking == ChangeTracking.DeferredExplicit && !links.scheduledOperation) {
                            links.scheduledOperation = ScheduledOperation.DirtyCheck;
                        }
                        break;
                    case ObjectState.Detached:
                        callback(new Error("Cannot save a detached object."));
                        return;
                    case ObjectState.Removed:
                        // Cancel delete operation and make managed.
                        links.scheduledOperation = ScheduledOperation.None;
                        links.state = ObjectState.Managed;
                        break;
                }
            }
        }

        callback();
    }

    private _remove(obj: any, callback: Callback): void {

        this._referencedEntities(obj, PropertyFlags.CascadeRemove | PropertyFlags.Dereference, (err, entities) => {
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
                        if (links.scheduledOperation == ScheduledOperation.Insert) {
                            // if the object has never been persisted then unlink the object and clear it's id
                            this._unlinkObject(links);
                        }
                        else {
                            // queue object for delete operation
                            links.scheduledOperation = ScheduledOperation.Delete;
                            links.state = ObjectState.Removed;
                            // object is unlinked after flush
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

    private _detach(obj: any, callback: Callback): void {

        this._referencedEntities(obj, PropertyFlags.CascadeDetach, (err, entities) => {
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

    private _flush(callback: Callback): void {

        // Get all list of all object links. A for-in loop is slow so build a list from the map since we are going
        // to have to iterate through the list several times.
        var list = this._getAllObjectLinks();

        // MongoDB bulk operations need to be ordered by operation type or they are not executed
        // as bulk operations. The Batch will group operations by collection but will not reorder them.
        var batch = new Batch();

        // do a dirty check if the object is scheduled for dirty check or the change tracking is deferred implicit and the object is not scheduled for anything else
        for(var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            // TODO: ignore read-only objects
            if (links.scheduledOperation == ScheduledOperation.DirtyCheck || (links.persister.changeTracking == ChangeTracking.DeferredImplicit && !links.scheduledOperation)) {
                links.originalDocument = links.persister.dirtyCheck(batch, links.object, links.originalDocument);
            }
        }

        // Add all inserts
        for (var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            if (links.scheduledOperation == ScheduledOperation.Insert) {
                links.originalDocument = links.persister.insert(batch, links.object);
            }
        }

        // Add all deletes
        for (var i = 0, l = list.length; i < l; i++) {
            var links = list[i];
            if (links.scheduledOperation == ScheduledOperation.Delete) {
                links.persister.remove(batch, links.object);
            }
        }

        // TODO: what to do if we get an error during execute? Should we make the session invalid? yes.
        batch.execute(err => {
            if(err) return callback(err);

            for (var i = 0, l = list.length; i < l; i++) {
                var links = list[i];
                if(links.scheduledOperation == ScheduledOperation.Delete) {
                    // after a successful delete operation unlink the object
                    this._unlinkObject(links);
                }
                // clear any scheduled operations
                links.scheduledOperation = ScheduledOperation.None;
            }
            callback();
        });
    }

    clear(): void {

        this._objectLinks = {};
    }

    getId(obj: any): Identifier {

        return obj["_id"];
    }

    getObject(id: Identifier): any {

        var links = this._objectLinks[id.toString()];
        if (links) {
            return links.object;
        }
    }

    registerManaged(persister: EntityPersister, entity: any, document: any): void {

        // save the original document for dirty checking
        this._linkObject(entity, persister).originalDocument = document;
    }

    find<T>(ctr: Constructor<T>, id: Identifier, callback: ResultCallback<T>): void {

        // check to see if object is already loaded
        var entity = this.getObject(id);
        if (entity) {
            return process.nextTick(() => callback(null, entity));
        }

        var persister = this.factory.getPersisterForConstructor(ctr);
        if (!persister) {
            return process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
        }

        persister.load(this, id, callback);
    }

    /*
    load(mapping: TypeMapping, id: Identifier, callback: ResultCallback<any>): void {

        // check to see if object is already loaded
        var entity = this.getObject(id);
        if (entity) {
            return process.nextTick(() => callback(null, entity));
        }

        this.factory.getPersisterForMapping(mapping).load(this, id, callback);
    }
    */

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
                var persister = this.factory.getPersisterForObject(obj);
                if (!persister) return;

                links = this._linkObject(obj, persister);
                links.state = ObjectState.Detached;
            }
            return links;
        }
    }

    private _linkObject(obj: any, persister: EntityPersister, operation = ScheduledOperation.None): ObjectLinks {

        var id = obj["_id"].toString();
        if(this._objectLinks[id]) {
            throw new Error("Session already contains a managed entity with identifier '" + id + "'.");
        }

        var links = {
            state: ObjectState.Managed,
            scheduledOperation: operation,
            object: obj,
            persister: persister
        }

        return this._objectLinks[id] = links;
    }

    private _unlinkObject(links: ObjectLinks): void {

        delete this._objectLinks[links.object["_id"].toString()];

        // if the object was never persisted or if it has been removed, then clear it's identifier as well
        if (links.scheduledOperation == ScheduledOperation.Insert || links.state == ObjectState.Removed) {
            this._clearIdentifier(links.object);
        }
    }

    private _clearIdentifier(obj: any): void {

        delete obj["_id"];
    }

    private _referencedEntities(obj: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {
        // TODO: fix
        process.nextTick(() => callback(null, [obj]));
    }
    /*
    private _referencedEntities(obj: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {

        var persister = this.factory.getPersisterForObject(obj);
        if (!persister) {
            return process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
        }

        var entities: any[] = [],
            embedded: any[] = [];
        this._walkEntity(obj, persister.mapping, flags, entities, embedded, err => {
            if(err) return process.nextTick(() => callback(err));
            return process.nextTick(() => callback(null, entities));
        });
    }

    private _walkEntity(entity: any, mapping: TypeMapping, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        this._walkValue(entity, mapping.type, flags, entities, embedded, references);

        // TODO: load references in batches grouped by root mapping
        async.each(references, (reference: Reference, done: (err?: Error) => void) => {
            this.load(reference.mapping, reference.id, (err: Error, entity: any) => {
                if (err) return done(err);
                this._walkEntity(entity, reference.mapping, flags, entities, embedded, done);
            });
        }, callback);
    }

    private _walkValue(value: any, type: reflect.Type, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        /*
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
        // TODO: handle indexed types

        if (type.isObjectType()) {
            // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
            // does not exist, default to mapping for type.
            var mapping = this.factory.getMappingForObject(value) || this.factory.getMappingForType(type);
            if (!mapping) return;

            if (mapping.flags & TypeMappingFlags.DocumentType) {
                // if the object is not an instance of the entity's constructor then it should be an identifier or DBRef
                if(!(value instanceof mapping.classConstructor)) {
                    // TODO: handle DBRef
                    if(!mapping.root.identity.validate(value)) {
                        return;
                    }
                    var entity = this.getObject(value);
                    if (entity) {
                        value = entity;
                    }
                    else {
                        if(flags & PropertyFlags.Dereference) {
                            // store reference to resolve later
                            references.push({ mapping: mapping, id: value });
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
    */
}

export = SessionImpl;