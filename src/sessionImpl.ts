/// <reference path="../typings/async.d.ts" />
/// <reference path="../typings/node.d.ts" />

import events = require("events");

import async = require("async");
import Callback = require("./core/callback");
import ChangeTracking = require("./mapping/changeTracking");
import Constructor = require("./core/constructor");
import IteratorCallback = require("./core/iteratorCallback");
import Map = require("./core/map");
import PropertyFlags = require("./mapping/propertyFlags");
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import InternalSessionFactory = require("./internalSessionFactory");
import TaskQueue = require("./taskQueue");
import Persister = require("./persister");
import Batch = require("./batch");
import Reference = require("./reference");
import Table = require("./core/table");
import EntityMapping = require("./mapping/entityMapping");
import QueryBuilder = require("./query/queryBuilder");
import QueryBuilderImpl = require("./query/queryBuilderImpl");
import FindOneQuery = require("./query/findOneQuery");
import QueryDescriptor = require("./query/queryDefinition");
import Observer = require("./observer");

/**
 * The state of an object.
 */
const enum ObjectState {

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
     * from the database. Once the entity is deleted from the database, the entity is no longer managed and is
     * considered a new entity.
     */
    Removed
}

const enum ObjectFlags {

    None        = 0,
    ReadOnly    = 0x00000001,
    Dirty       = 0x00000002,
    Observing   = 0x00000004
}

const enum ScheduledOperation {

    None = 0,
    Insert,
    Update,
    Delete,
    DirtyCheck
}

const enum Action {

    Save        = 0x00000001,
    Remove      = 0x00000002,
    Detach      = 0x00000004,
    Flush       = 0x00000008,
    Clear       = 0x00000010,
    Refresh     = 0x00000020,
    Merge       = 0x00000040,
    Fetch       = 0x00000080,
    FindQuery   = 0x00000100,
    ModifyQuery = 0x00000200,
    Wait        = 0x00000400,
    Close       = 0x00000800,

    ReadOnly = Fetch | FindQuery,
    All = Save | Remove | Detach | Flush | Clear | Refresh | Merge | Fetch | FindQuery | ModifyQuery | Wait | Close
}

interface ObjectLinks {

    state: ObjectState;
    flags: ObjectFlags;
    object?: any;
    originalDocument?: any;
    persister?: Persister;
    scheduledOperation?: ScheduledOperation;
    next?: ObjectLinks;
    prev?: ObjectLinks;
    index?: number;
    observer?: Observer;
}

/**
 * Static ObjectLinks returned from getObjectLinks for detached objects. There is no need to create a new ObjectLinks
 * object for each detached object.
 */
var cachedDetachedLinks: ObjectLinks = {
    state: ObjectState.Detached,
    flags: ObjectFlags.None
}

// TODO: review all errors and decide if they are operational or programmer errors. For example, what about mapping errors?
// TODO: decide where it makes sense to use WeakMap, Promise, Set, WeakSet which is now a native part of Node 12
// TODO: raise events on UnitOfWork
class SessionImpl extends events.EventEmitter implements InternalSession {

    /**
     * Cached Persisters by Mapping
     */
    private _persisterByMapping: Table<Persister> = [];

    /**
     * Cached Query Builders by Mapping
     */
    private _queryByMapping: Table<QueryBuilder<any>> = [];

    /**
     * Hash table containing all objects by id associated with the session.
     */
    private _objectLinksById: Map<ObjectLinks> = {};

    /**
     * List of all ObjectLinks associated with the session.
     */
    private _objectLinks: ObjectLinks[] = [];

    /**
     * Scheduled operations linked list head.
     */
    private _scheduleHead: ObjectLinks;

    /**
     * Scheduled operations linked list tail.
     */
    private _scheduleTail: ObjectLinks;

    /**
     * Task queue coordinates asynchronous actions.
     */
    private _queue: TaskQueue;


    constructor(public factory: InternalSessionFactory) {
        super();

        this._queue = new TaskQueue((action, args, callback) => this._execute(action, args, callback));

        // if we get an error on the queue, raise it on the session
        this._queue.on('error', (err: Error) => {
           this.emit('error', err);
        });
    }

    save(obj: any, callback?: Callback): void {

        this._queue.add(Action.Save, Action.All & ~(Action.Save | Action.ReadOnly), obj, callback);
    }

    remove(obj: any, callback?: Callback): void {

        this._queue.add(Action.Remove, Action.All & ~Action.Remove, obj, callback);
    }

    refresh(obj: any, callback?: Callback): void {

        this._queue.add(Action.Refresh, Action.All & ~Action.Refresh, obj, callback);
    }

    detach(obj: any, callback?: Callback): void {

        this._queue.add(Action.Detach, Action.All & ~Action.Detach, obj, callback);
    }

    clear(callback?: Callback): void {

        this._queue.add(Action.Clear, Action.All, undefined, callback);
    }

    flush(callback?: Callback): void {

        this._queue.add(Action.Flush, Action.All, undefined, callback);
    }

    wait(callback?: Callback): void {

        this._queue.add(Action.Wait, Action.All, undefined, callback);
    }

    find<T>(ctr: Constructor<T>, id: any, callback?: ResultCallback<T>): FindOneQuery<T> {

        return this.query(ctr).findOneById(id, callback);
    }

    fetch<T>(obj: T, pathsOrCallback: any, callback?: ResultCallback<T>): void {

        var paths: string[];

        if(typeof pathsOrCallback === "function") {
            callback = pathsOrCallback;
        }
        else if(typeof pathsOrCallback === "string") {
            paths = [pathsOrCallback];
        }
        else {
            paths = pathsOrCallback;
        }

        this._queue.add(Action.Fetch, Action.All & ~Action.ReadOnly, [obj, paths], callback);
    }

    close(callback?: Callback): void {

        this._queue.add(Action.Close, Action.All, undefined, callback);
    }

    executeQuery(query: QueryDescriptor, callback: ResultCallback<any>): void {

        if(query.readOnly) {
            this._queue.add(Action.FindQuery, Action.All & ~Action.ReadOnly, query, callback);
        }
        else {
            this._queue.add(Action.ModifyQuery, Action.All, query, callback);
        }
    }

    /**
     * Gets the database identifier for an entity.
     * @param obj The entity.
     */
    getId(obj: any): any {

        return obj["_id"];
    }

    /**
     * Determines whether an entity is managed by this session.
     * @param entity The entity to check.
     */
    contains(obj: any): boolean {

        var id = obj["_id"];
        if(id) {
            var links = this._objectLinksById[id.toString()];
            if(links && links.state == ObjectState.Managed) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get an instance whose state may be fetched in the future.
     * @param ctr The constructor
     * @param id The id of the entity
     * @returns The entity instance or a reference to the entity instance.
     */
    getReference<T>(ctr: Constructor<T>, id: any): T {

        // If mapping is not found, the reference is still created and an error is returned when the client tries
        // to resolve the reference.
        var mapping = this.factory.getMappingForConstructor(ctr);
        if (mapping) {
            if(typeof id === "string") {
                id = mapping.identity.fromString(id);
            }
        }

        return this.getReferenceInternal(mapping, id);
    }

    getReferenceInternal(mapping: EntityMapping, id: any): any {

        // TODO: should we cache references so all references with the same id share the same object?
        return this.getObject(id) || new Reference(mapping, id);
    }

    /**
     * Gets a managed object by the specified id. If the object is found but scheduled for delete then null is
     * returned. If the object is not found then undefined is returned; otherwise, the object is returned.
     * @param id The object identifier.
     */
    getObject(id: any): any {

        if(id == null) {
            throw new Error("Missing required argument 'id'.");
        }

        var links = this._objectLinksById[id.toString()];
        if (links) {
            switch(links.state) {
                case ObjectState.Removed:
                    return null
                case ObjectState.Managed:
                    return links.object
            }
        }

        // otherwise, return undefined
    }

    registerManaged(persister: Persister, entity: any, document: any): void {

        // save the original document for dirty checking
        var links = this._linkObject(entity, persister);
        links.originalDocument = document;
        this._trackChanges(links);
    }

    private _trackChanges(links: ObjectLinks): void {

        if((links.flags & ObjectFlags.Dirty) || links.persister.changeTracking == ChangeTracking.DeferredImplicit) {
            this._makeDirty(links);
            return;
        }

        if (links.persister.changeTracking != ChangeTracking.Observe) {
            return;
        }

        if(links.observer) {
            // object is already being watched
            return;
        }

        links.observer = new Observer(() => {
            // value has changed
            this._makeDirty(links)
            links.observer = undefined;
        });
        links.persister.watch(links.object, links.observer);
    }

    private _stopWatching(links: ObjectLinks): void {

        if(links.observer) {
            links.observer.destroy();
            links.observer = undefined;
        }
    }

    getPersister(mapping: EntityMapping): Persister {

        return this._persisterByMapping[mapping.id]
            || (this._persisterByMapping[mapping.id] = this.factory.createPersister(this, mapping));
    }

    query<T>(ctr: Constructor<T>): QueryBuilder<T> {

        var mapping = this.factory.getMappingForConstructor(ctr);
        if(!mapping) {
            // TODO: instead of throwing error, return a placeholder Query object that will return an error when one of it's functions are called
            throw new Error("Object type is not mapped as an entity.");
        }

        var query = this._queryByMapping[mapping.id];
        if(!query) {
            query = new QueryBuilderImpl(this, this.getPersister(mapping));
            this._queryByMapping[mapping.id] = query;
        }

        return query;
    }

    /**
     * Called by TaskQueue to execute an operation.
     * @param action The action to execute.
     * @param arg Contains arguments for the action.
     * @param callback Called when method completes.
     */
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
            case Action.Refresh:
                this._refresh(arg, callback);
                break;
            case Action.Clear:
                this._clear(callback);
                break;
            case Action.Flush:
                this._flush(callback);
                break;
            case Action.Wait:
                if(callback) callback(null);
                break;
            case Action.Fetch:
                this.fetchInternal(arg[0], arg[1], callback);
                break;
            case Action.FindQuery:
            case Action.ModifyQuery:
                (<QueryDescriptor>arg).execute(callback);
                break;
            case Action.Close:
                this._close(callback);
                break;
        }
    }

    private _save(obj: any, callback: Callback): void {

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
                var persister = this._getPersisterForObject(obj);
                if (!persister) {
                    callback(new Error("Object type is not mapped as an entity."));
                    return;
                }

                // we haven't seen this object before
                obj["_id"] = persister.identity.generate();
                links = this._linkObject(obj, persister);
                this._scheduleOperation(links, ScheduledOperation.Insert);
            }
            else {
                switch (links.state) {
                    case ObjectState.Managed:
                        if (links.persister.changeTracking == ChangeTracking.DeferredExplicit) {
                            this._makeDirty(links);
                        }
                        break;
                    case ObjectState.Detached:
                        callback(new Error("Cannot save a detached object."));
                        return;
                    case ObjectState.Removed:
                        if (links.scheduledOperation == ScheduledOperation.Delete) {
                            // if object is schedule for delete then cancel the pending delete operation.
                            this._clearScheduledOperation(links);
                            this._trackChanges(links);
                        }
                        else {
                            // otherwise, this means the entity has already been removed from the database so queue
                            // object for insert operation.
                            this._scheduleOperation(links, ScheduledOperation.Insert);
                        }

                        links.state = ObjectState.Managed;
                        break;
                }
            }
        }

        callback();
    }

    private _makeDirty(links: ObjectLinks): void {

        // still flag the object as dirty even if we aren't going to schedule a dirty check because
        // the current operation could be canceled (e.g. save called after remove before flush),
        // and we'll want to queue the object for dirty check at that point.
        links.flags |= ObjectFlags.Dirty;
        if(!links.scheduledOperation) {
            this._scheduleOperation(links, ScheduledOperation.DirtyCheck);
        }
    }

    private _clearDirty(links: ObjectLinks): void {

        // clear dirty flag
        links.flags &= ~ObjectFlags.Dirty;
        // clear scheduled operation if object is scheduled for dirty check
        if(links.scheduledOperation == ScheduledOperation.DirtyCheck) {
            this._clearScheduledOperation(links);
        }
    }

    /**
     * Notifies session that a managed entity has been removed from the database from outside of the session.
     * @param entity The entity that was removed.
     */
    notifyRemoved(entity: Object): void {

        // Remove entity. No need to schedule delete operation since it is already removed from the database.
        if(!this._removeEntity(entity, /* scheduleDelete */ false)) {
            // this should never happen
            throw new Error("Cannot remove a detached object.");
        }
    }

    private _remove(obj: any, callback: Callback): void {

        this._findReferencedEntities(obj, PropertyFlags.CascadeRemove | PropertyFlags.Dereference, (err, entities) => {
            if(err) return callback(err);
            this._removeEntities(entities, callback);
        });
    }

    private _removeEntities(entities: any[], callback: Callback): void {

        // remove in reverse order
        for(var i = entities.length - 1; i >= 0; i--) {
            var obj = entities[i];

            if(!this._removeEntity(obj, /* scheduleDelete */ true)) {
                callback(new Error("Cannot remove a detached object."));
                return;
            }
        }

        callback();
    }

    private _removeEntity(obj: any, scheduleDelete: boolean): boolean {

        var links = this._getObjectLinks(obj);
        if (links) {
            switch (links.state) {
                case ObjectState.Managed:
                    // set state as removed, object wil be unlinked after flush.
                    links.state = ObjectState.Removed;

                    if (links.scheduledOperation == ScheduledOperation.Insert) {
                        // if the object has never been persisted then clear the insert operation and unlink it
                        this._unlinkObject(links);
                        this._clearScheduledOperation(links);
                    }
                    else {
                        // otherwise, queue object for delete operation
                        if(scheduleDelete) {
                            this._scheduleOperation(links, ScheduledOperation.Delete);
                        }
                    }
                    break;
                case ObjectState.Detached:
                    return false;
            }
        }

        return true;
    }

    private _detach(obj: any, callback: Callback): void {

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
                this._clearScheduledOperation(links);
            }
            // TODO: double check how we want to handle Removed entities here.
        }

        callback();
    }

    private _refresh(obj: any, callback: Callback): void {

        this._findReferencedEntities(obj, PropertyFlags.CascadeRefresh, (err, entities) => {
            if(err) return callback(err);
            this._refreshEntities(entities, callback);
        });
    }

    private _refreshEntities(entities: any[], callback: Callback): void {

        async.each(entities, (entity: any, done: (err?: Error) => void) => {
            var links = this._getObjectLinks(entity);
            if (!links || links.state != ObjectState.Managed) {
                return done(new Error("Object is not managed."));
            }

            // Refreshing an entity should not cause it to become dirty, so if we have an observer, destroy it before
            // refreshing the object.
            this._stopWatching(links);

            links.persister.refresh(links.object, (err, document) => {
                if(err) return done(err);
                links.originalDocument = document;

                // clear dirty because object may have been dirty before refresh
                this._clearDirty(links);
                this._trackChanges(links);
                done();
            });
        }, callback);
    }

    private _flush(callback: Callback): void {

        var head = this._scheduleHead;

        // clear list of scheduled objects
        this._scheduleHead = this._scheduleTail = null;

        var batch = new Batch();
        this._buildBatch(batch, head, (err) => {
            if(err) return callback(err);

            batch.execute((err) => {
                if (err) return callback(err);

                this._batchCompleted(head, callback);
            });
        });
    }

    /**
     * Populates the batch with the current scheduled operations. Since building the batch could take a long time if
     * there are many scheduled operations, break it up into chucks so we are not blocking the Node event queue.
     * @param batch The batch to build
     * @param links The current link in the list of scheduled operations
     * @param callback Called when the batch has been built
     */
    private _buildBatch(batch: Batch, links: ObjectLinks, callback: Callback): void {

        var count = 0;

        while(links && count < 1000) {

            if (links.scheduledOperation == ScheduledOperation.DirtyCheck) {
                var result = links.persister.dirtyCheck(batch, links.object, links.originalDocument);
                if(result.error) {
                    return callback(result.error);
                }
                else {
                    links.originalDocument = result.value;
                }
            }
            else if (links.scheduledOperation == ScheduledOperation.Insert) {
                var result = links.persister.addInsert(batch, links.object);
                if(result.error) {
                    return callback(result.error);
                }
                else {
                    links.originalDocument = result.value;
                }
            }
            else if (links.scheduledOperation == ScheduledOperation.Delete) {
                links.persister.addRemove(batch, links.object);
            }

            links = links.next;
            count++;
        }

        // If there are more links in the queue, continue building the batch on the next tick.
        if(links) {
            process.nextTick(() => this._buildBatch(batch, links, callback));
        }
        else {
            callback();
        }
    }

    /**
     * Called after a batch is successfully executed.
     * @param head The head of the scheduled operation list.
     * @param callback Called when processing is completed.
     */
    private _batchCompleted(head: ObjectLinks, callback: Callback): void {

        var links = head;
        while(links) {
            var next = links.next;

            links.scheduledOperation = ScheduledOperation.None;
            links.flags = ObjectFlags.None;
            // Remove links from list. No need to fix up links of prev/next because all items will be removed from
            // the list.
            links.prev = links.next = null;

            switch(links.state) {
                case ObjectState.Removed:
                    // unlink any removed objects.
                    this._unlinkObject(links);
                    // then remove it's identifier
                    this._clearIdentifier(links);
                    break;
                case ObjectState.Managed:
                    this._trackChanges(links);
                    break;
                default:
                    return callback(new Error("Unexpected object state in flush."));
            }

            links = next;
        }

        callback();
    }

    private _close(callback: Callback): void {

        this._queue.close();

        // flush and then clear the session
        this._flush((err) => {
            if(err) return callback(err);
            this._clear(callback);
        });
    }

    fetchInternal(obj: any, paths: string[], callback: ResultCallback<any>): void {

        // TODO: when a reference is resolved do we update the referenced object? __proto__ issue.
        if(Reference.isReference(obj)) {
            (<Reference>obj).fetch(this, (err, entity) => {
                if(err) return callback(err);
                this._fetchPaths(entity, paths, callback);
            });
        }
        else {
            this._fetchPaths(obj, paths, callback);
        }
    }

    private _fetchPaths(obj: any, paths: string[], callback: ResultCallback<any>): void {

        var links = this._getObjectLinks(obj);
        if (!links || links.state == ObjectState.Detached) {
            return callback(new Error("Object is not associated with the session."));
        }

        if(!paths || paths.length === 0) {
            process.nextTick(() => callback(null, obj));
        }

        var persister = links.persister;

        async.each(paths, (path: string, done: (err?: Error) => void) => {
            persister.fetch(obj, path, done);
        },
        (err) => {
            if(err) return callback(err);
            callback(null, obj);
        });
    }

    /**
     * Detaches all managed objects.
     * @param callback Callback to execute after operation completes.
     */
    private _clear(callback: Callback): void {

        for(var i = 0; i < this._objectLinks.length; i++) {
            var links = this._objectLinks[i];
            if(links) {
                // We call _cleanupUnlinkedObject instead of _unlinkObject because we clear the entire _objectLinks
                // list and _objectLinksById map so there is no need to remove the links individually.
                this._cleanupUnlinkedObject(links);
            }
        }

        // clear all object links
        this._objectLinksById = {};
        this._objectLinks = [];
        // clear scheduled operations
        this._scheduleHead = this._scheduleTail = null

        process.nextTick(callback);
    }

    private _getObjectLinks(obj: any): ObjectLinks {

        var id = obj["_id"];
        if (id) {
            var links = this._objectLinksById[id.toString()];
            if (!links || links.object !== obj) {
                // If we have an id but no links then the object must be detached since we assume that we manage
                // the assignment of the identifier.
                // Also, we the id is linked but the object in the session is different than the object passed in
                // then we also have a detached object.
                return cachedDetachedLinks;
            }
            return links;
        }
    }

    private _linkObject(obj: any, persister: Persister): ObjectLinks {

        var _id = obj["_id"];
        if(_id === undefined) {
            throw new Error("Object is missing identifier.");
        }

        var id = _id.toString();
        if(this._objectLinksById[id]) {
            throw new Error("Session already contains an entity with identifier '" + id + "'.");
        }

        var links = {
            state: ObjectState.Managed,
            flags: ObjectFlags.None,
            object: obj,
            persister: persister,
            index: this._objectLinks.length
        }

        this._objectLinksById[id] = links;
        this._objectLinks.push(links);
        return links;
    }

    private _unlinkObject(links: ObjectLinks): void {

        this._objectLinksById[links.object["_id"].toString()] = undefined;
        this._objectLinks[links.index] = undefined;

        this._cleanupUnlinkedObject(links);
    }

    private _cleanupUnlinkedObject(links: ObjectLinks): void {

        this._stopWatching(links);
        // if the object was never persisted, then clear it's identifier as well
        if (links.scheduledOperation == ScheduledOperation.Insert) {
            this._clearIdentifier(links);
        }
    }

    private _scheduleOperation(links: ObjectLinks, operation: ScheduledOperation): void {

        // TODO: maintain a count of scheduled operations by Root Mapping so query operations know if a flush is needed before query

        if(!links.scheduledOperation) {
            if(this._scheduleHead) {
                // add operation to the end of the schedule
                this._scheduleTail.next = links;
                links.prev = this._scheduleTail;
                this._scheduleTail = links;
            }
            else {
                // this is the first scheduled operation so initialize the schedule
                this._scheduleHead = this._scheduleTail = links;
            }
        }

        links.scheduledOperation = operation;
    }

    private _clearScheduledOperation(links: ObjectLinks): void {

        if(!links.scheduledOperation) {
            return;
        }

        // remove links from the schedule
        if(links.prev) {
            links.prev.next = links.next;
        }
        else {
            this._scheduleHead = links.next;
        }

        if(links.next) {
            links.next.prev = links.prev;
        }
        else {
            this._scheduleTail = links.prev;
        }

        links.scheduledOperation = ScheduledOperation.None;
    }

    private _clearIdentifier(links: ObjectLinks): void {

        delete links.object["_id"];
    }

    private _findReferencedEntities(obj: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {

        var mapping = this.factory.getMappingForObject(obj);
        if (!mapping) {
            process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
            return;
        }

        var entities: any[] = [],
            embedded: any[] = [];

        this._walk(mapping, obj, flags, entities, embedded, err => {
            if(err) return process.nextTick(() => callback(err));
            return process.nextTick(() => callback(null, entities));
        });
    }

    private _walk(mapping: EntityMapping, entity: any, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        mapping.walk(this, entity, flags | PropertyFlags.WalkEntities, entities, embedded, references);

        async.each(references, (reference: Reference, done: (err?: Error) => void) => {

            reference.fetch(this, (err: Error, entity: any) => {
                if (err) return done(err);
                this._walk(reference.mapping, entity, flags, entities, embedded, done);
            });
        }, callback);
    }

    private _getPersisterForObject(obj: any): Persister {

        var mapping = this.factory.getMappingForObject(obj);
        if(mapping) {
            return this.getPersister(mapping);
        }
    }

    private _getPersisterForConstructor(ctr: Constructor<any>): Persister {

        var mapping = this.factory.getMappingForConstructor(ctr);
        if(mapping) {
            return this.getPersister(mapping);
        }
    }
}

export = SessionImpl;