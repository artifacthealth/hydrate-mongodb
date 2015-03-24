var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require("events");
var async = require("async");
var ChangeTracking = require("./mapping/changeTracking");
var TaskQueue = require("./taskQueue");
var Batch = require("./batch");
var Reference = require("./reference");
var QueryBuilderImpl = require("./query/queryBuilderImpl");
var Observer = require("./observer");
/**
 * Static ObjectLinks returned from getObjectLinks for detached objects. There is no need to create a new ObjectLinks
 * object for each detached object.
 */
var cachedDetachedLinks = {
    state: 1 /* Detached */,
    flags: 0 /* None */
};
// TODO: review all errors and decide if they are operational or programmer errors. For example, what about mapping errors?
// TODO: decide where it makes sense to use WeakMap, Promise, Set, WeakSet which is now a native part of Node 12
// TODO: raise events on UnitOfWork
var SessionImpl = (function (_super) {
    __extends(SessionImpl, _super);
    function SessionImpl(factory) {
        var _this = this;
        _super.call(this);
        this.factory = factory;
        /**
         * Cached Persisters by Mapping
         */
        this._persisterByMapping = [];
        /**
         * Cached Query Builders by Mapping
         */
        this._queryByMapping = [];
        /**
         * Hash table containing all objects by id associated with the session.
         */
        this._objectLinksById = {};
        /**
         * List of all ObjectLinks associated with the session.
         */
        this._objectLinks = [];
        this._queue = new TaskQueue(function (action, args, callback) { return _this._execute(action, args, callback); });
        // if we get an error on the queue, raise it on the session
        this._queue.on('error', function (err) {
            _this.emit('error', err);
        });
    }
    SessionImpl.prototype.save = function (obj, callback) {
        this._queue.add(1 /* Save */, 4095 /* All */ & ~(1 /* Save */ | 384 /* ReadOnly */), obj, callback);
    };
    SessionImpl.prototype.remove = function (obj, callback) {
        this._queue.add(2 /* Remove */, 4095 /* All */ & ~2 /* Remove */, obj, callback);
    };
    SessionImpl.prototype.refresh = function (obj, callback) {
        this._queue.add(32 /* Refresh */, 4095 /* All */ & ~32 /* Refresh */, obj, callback);
    };
    SessionImpl.prototype.detach = function (obj, callback) {
        this._queue.add(4 /* Detach */, 4095 /* All */ & ~4 /* Detach */, obj, callback);
    };
    SessionImpl.prototype.clear = function (callback) {
        this._queue.add(16 /* Clear */, 4095 /* All */, undefined, callback);
    };
    SessionImpl.prototype.flush = function (callback) {
        this._queue.add(8 /* Flush */, 4095 /* All */, undefined, callback);
    };
    SessionImpl.prototype.wait = function (callback) {
        this._queue.add(1024 /* Wait */, 4095 /* All */, undefined, callback);
    };
    SessionImpl.prototype.find = function (ctr, id, callback) {
        return this.query(ctr).findOneById(id, callback);
    };
    SessionImpl.prototype.fetch = function (obj, pathsOrCallback, callback) {
        var paths;
        if (typeof pathsOrCallback === "function") {
            callback = pathsOrCallback;
        }
        else if (typeof pathsOrCallback === "string") {
            paths = [pathsOrCallback];
        }
        else {
            paths = pathsOrCallback;
        }
        this._queue.add(128 /* Fetch */, 4095 /* All */ & ~384 /* ReadOnly */, [obj, paths], callback);
    };
    SessionImpl.prototype.close = function (callback) {
        this._queue.add(2048 /* Close */, 4095 /* All */, undefined, callback);
    };
    SessionImpl.prototype.executeQuery = function (query, callback) {
        if (query.readOnly) {
            this._queue.add(256 /* FindQuery */, 4095 /* All */ & ~384 /* ReadOnly */, query, callback);
        }
        else {
            this._queue.add(512 /* ModifyQuery */, 4095 /* All */, query, callback);
        }
    };
    /**
     * Gets the database identifier for an entity.
     * @param obj The entity.
     */
    SessionImpl.prototype.getId = function (obj) {
        return obj["_id"];
    };
    /**
     * Determines whether an entity is managed by this session.
     * @param entity The entity to check.
     */
    SessionImpl.prototype.contains = function (obj) {
        var id = obj["_id"];
        if (id) {
            var links = this._objectLinksById[id.toString()];
            if (links && links.state == 0 /* Managed */) {
                return true;
            }
        }
        return false;
    };
    /**
     * Get an instance whose state may be fetched in the future.
     * @param ctr The constructor
     * @param id The id of the entity
     * @returns The entity instance or a reference to the entity instance.
     */
    SessionImpl.prototype.getReference = function (ctr, id) {
        // If mapping is not found, the reference is still created and an error is returned when the client tries
        // to resolve the reference.
        var mapping = this.factory.getMappingForConstructor(ctr);
        if (mapping) {
            if (typeof id === "string") {
                id = mapping.identity.fromString(id);
            }
        }
        return this.getReferenceInternal(mapping, id);
    };
    SessionImpl.prototype.getReferenceInternal = function (mapping, id) {
        // TODO: should we cache references so all references with the same id share the same object?
        return this.getObject(id) || new Reference(mapping, id);
    };
    /**
     * Gets a managed object by the specified id. If the object is found but scheduled for delete then null is
     * returned. If the object is not found then undefined is returned; otherwise, the object is returned.
     * @param id The object identifier.
     */
    SessionImpl.prototype.getObject = function (id) {
        if (id == null) {
            throw new Error("Missing required argument 'id'.");
        }
        var links = this._objectLinksById[id.toString()];
        if (links) {
            switch (links.state) {
                case 2 /* Removed */:
                    return null;
                case 0 /* Managed */:
                    return links.object;
            }
        }
        // otherwise, return undefined
    };
    SessionImpl.prototype.registerManaged = function (persister, entity, document) {
        // save the original document for dirty checking
        var links = this._linkObject(entity, persister);
        links.originalDocument = document;
        this._trackChanges(links);
    };
    SessionImpl.prototype._trackChanges = function (links) {
        var _this = this;
        if ((links.flags & 2 /* Dirty */) || links.persister.changeTracking == 0 /* DeferredImplicit */) {
            this._makeDirty(links);
            return;
        }
        if (links.persister.changeTracking != 2 /* Observe */) {
            return;
        }
        if (links.observer) {
            // object is already being watched
            return;
        }
        links.observer = new Observer(function () {
            // value has changed
            _this._makeDirty(links);
            links.observer = undefined;
        });
        links.persister.watch(links.object, links.observer);
    };
    SessionImpl.prototype._stopWatching = function (links) {
        if (links.observer) {
            links.observer.destroy();
            links.observer = undefined;
        }
    };
    SessionImpl.prototype.getPersister = function (mapping) {
        return this._persisterByMapping[mapping.id] || (this._persisterByMapping[mapping.id] = this.factory.createPersister(this, mapping));
    };
    SessionImpl.prototype.query = function (ctr) {
        var mapping = this.factory.getMappingForConstructor(ctr);
        if (!mapping) {
            throw new Error("Object type is not mapped as an entity.");
        }
        var query = this._queryByMapping[mapping.id];
        if (!query) {
            query = new QueryBuilderImpl(this, this.getPersister(mapping));
            this._queryByMapping[mapping.id] = query;
        }
        return query;
    };
    /**
     * Called by TaskQueue to execute an operation.
     * @param action The action to execute.
     * @param arg Contains arguments for the action.
     * @param callback Called when method completes.
     */
    SessionImpl.prototype._execute = function (action, arg, callback) {
        switch (action) {
            case 1 /* Save */:
                this._save(arg, callback);
                break;
            case 2 /* Remove */:
                this._remove(arg, callback);
                break;
            case 4 /* Detach */:
                this._detach(arg, callback);
                break;
            case 32 /* Refresh */:
                this._refresh(arg, callback);
                break;
            case 16 /* Clear */:
                this._clear(callback);
                break;
            case 8 /* Flush */:
                this._flush(callback);
                break;
            case 1024 /* Wait */:
                if (callback)
                    callback(null);
                break;
            case 128 /* Fetch */:
                this.fetchInternal(arg[0], arg[1], callback);
                break;
            case 256 /* FindQuery */:
            case 512 /* ModifyQuery */:
                arg.execute(callback);
                break;
            case 2048 /* Close */:
                this._close(callback);
                break;
        }
    };
    SessionImpl.prototype._save = function (obj, callback) {
        var _this = this;
        this._findReferencedEntities(obj, 2 /* CascadeSave */, function (err, entities) {
            if (err)
                return callback(err);
            _this._saveEntities(entities, callback);
        });
    };
    SessionImpl.prototype._saveEntities = function (entities, callback) {
        for (var i = 0, l = entities.length; i < l; i++) {
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
                this._scheduleOperation(links, 1 /* Insert */);
            }
            else {
                switch (links.state) {
                    case 0 /* Managed */:
                        if (links.persister.changeTracking == 1 /* DeferredExplicit */) {
                            this._makeDirty(links);
                        }
                        break;
                    case 1 /* Detached */:
                        callback(new Error("Cannot save a detached object."));
                        return;
                    case 2 /* Removed */:
                        if (links.scheduledOperation == 3 /* Delete */) {
                            // if object is schedule for delete then cancel the pending delete operation.
                            this._clearScheduledOperation(links);
                            this._trackChanges(links);
                        }
                        else {
                            // otherwise, this means the entity has already been removed from the database so queue
                            // object for insert operation.
                            this._scheduleOperation(links, 1 /* Insert */);
                        }
                        links.state = 0 /* Managed */;
                        break;
                }
            }
        }
        callback();
    };
    SessionImpl.prototype._makeDirty = function (links) {
        // still flag the object as dirty even if we aren't going to schedule a dirty check because
        // the current operation could be canceled (e.g. save called after remove before flush),
        // and we'll want to queue the object for dirty check at that point.
        links.flags |= 2 /* Dirty */;
        if (!links.scheduledOperation) {
            this._scheduleOperation(links, 4 /* DirtyCheck */);
        }
    };
    SessionImpl.prototype._clearDirty = function (links) {
        // clear dirty flag
        links.flags &= ~2 /* Dirty */;
        // clear scheduled operation if object is scheduled for dirty check
        if (links.scheduledOperation == 4 /* DirtyCheck */) {
            this._clearScheduledOperation(links);
        }
    };
    /**
     * Notifies session that a managed entity has been removed from the database from outside of the session.
     * @param entity The entity that was removed.
     */
    SessionImpl.prototype.notifyRemoved = function (entity) {
        // Remove entity. No need to schedule delete operation since it is already removed from the database.
        if (!this._removeEntity(entity, false)) {
            throw new Error("Cannot remove a detached object.");
        }
    };
    SessionImpl.prototype._remove = function (obj, callback) {
        var _this = this;
        this._findReferencedEntities(obj, 4 /* CascadeRemove */ | 1024 /* Dereference */, function (err, entities) {
            if (err)
                return callback(err);
            _this._removeEntities(entities, callback);
        });
    };
    SessionImpl.prototype._removeEntities = function (entities, callback) {
        for (var i = entities.length - 1; i >= 0; i--) {
            var obj = entities[i];
            if (!this._removeEntity(obj, true)) {
                callback(new Error("Cannot remove a detached object."));
                return;
            }
        }
        callback();
    };
    SessionImpl.prototype._removeEntity = function (obj, scheduleDelete) {
        var links = this._getObjectLinks(obj);
        if (links) {
            switch (links.state) {
                case 0 /* Managed */:
                    // set state as removed, object wil be unlinked after flush.
                    links.state = 2 /* Removed */;
                    if (links.scheduledOperation == 1 /* Insert */) {
                        // if the object has never been persisted then clear the insert operation and unlink it
                        this._unlinkObject(links);
                        this._clearScheduledOperation(links);
                    }
                    else {
                        // otherwise, queue object for delete operation
                        if (scheduleDelete) {
                            this._scheduleOperation(links, 3 /* Delete */);
                        }
                    }
                    break;
                case 1 /* Detached */:
                    return false;
            }
        }
        return true;
    };
    SessionImpl.prototype._detach = function (obj, callback) {
        var _this = this;
        this._findReferencedEntities(obj, 8 /* CascadeDetach */, function (err, entities) {
            if (err)
                return callback(err);
            _this._detachEntities(entities, callback);
        });
    };
    SessionImpl.prototype._detachEntities = function (entities, callback) {
        for (var i = 0, l = entities.length; i < l; i++) {
            var links = this._getObjectLinks(entities[i]);
            if (links && links.state == 0 /* Managed */) {
                this._unlinkObject(links);
                this._clearScheduledOperation(links);
            }
        }
        callback();
    };
    SessionImpl.prototype._refresh = function (obj, callback) {
        var _this = this;
        this._findReferencedEntities(obj, 16 /* CascadeRefresh */, function (err, entities) {
            if (err)
                return callback(err);
            _this._refreshEntities(entities, callback);
        });
    };
    SessionImpl.prototype._refreshEntities = function (entities, callback) {
        var _this = this;
        async.each(entities, function (entity, done) {
            var links = _this._getObjectLinks(entity);
            if (!links || links.state != 0 /* Managed */) {
                return done(new Error("Object is not managed."));
            }
            // Refreshing an entity should not cause it to become dirty, so if we have an observer, destroy it before
            // refreshing the object.
            _this._stopWatching(links);
            links.persister.refresh(links.object, function (err, document) {
                if (err)
                    return done(err);
                links.originalDocument = document;
                // clear dirty because object may have been dirty before refresh
                _this._clearDirty(links);
                _this._trackChanges(links);
                done();
            });
        }, callback);
    };
    SessionImpl.prototype._flush = function (callback) {
        var _this = this;
        var head = this._scheduleHead;
        // clear list of scheduled objects
        this._scheduleHead = this._scheduleTail = null;
        var batch = new Batch();
        this._buildBatch(batch, head, function (err) {
            if (err)
                return callback(err);
            batch.execute(function (err) {
                if (err)
                    return callback(err);
                _this._batchCompleted(head, callback);
            });
        });
    };
    /**
     * Populates the batch with the current scheduled operations. Since building the batch could take a long time if
     * there are many scheduled operations, break it up into chucks so we are not blocking the Node event queue.
     * @param batch The batch to build
     * @param links The current link in the list of scheduled operations
     * @param callback Called when the batch has been built
     */
    SessionImpl.prototype._buildBatch = function (batch, links, callback) {
        var _this = this;
        var count = 0;
        while (links && count < 1000) {
            if (links.scheduledOperation == 4 /* DirtyCheck */) {
                var result = links.persister.dirtyCheck(batch, links.object, links.originalDocument);
                if (result.error) {
                    return callback(result.error);
                }
                else {
                    links.originalDocument = result.value;
                }
            }
            else if (links.scheduledOperation == 1 /* Insert */) {
                var result = links.persister.addInsert(batch, links.object);
                if (result.error) {
                    return callback(result.error);
                }
                else {
                    links.originalDocument = result.value;
                }
            }
            else if (links.scheduledOperation == 3 /* Delete */) {
                links.persister.addRemove(batch, links.object);
            }
            links = links.next;
            count++;
        }
        // If there are more links in the queue, continue building the batch on the next tick.
        if (links) {
            process.nextTick(function () { return _this._buildBatch(batch, links, callback); });
        }
        else {
            callback();
        }
    };
    /**
     * Called after a batch is successfully executed.
     * @param head The head of the scheduled operation list.
     * @param callback Called when processing is completed.
     */
    SessionImpl.prototype._batchCompleted = function (head, callback) {
        var links = head;
        while (links) {
            var next = links.next;
            links.scheduledOperation = 0 /* None */;
            links.flags = 0 /* None */;
            // Remove links from list. No need to fix up links of prev/next because all items will be removed from
            // the list.
            links.prev = links.next = null;
            switch (links.state) {
                case 2 /* Removed */:
                    // unlink any removed objects.
                    this._unlinkObject(links);
                    // then remove it's identifier
                    this._clearIdentifier(links);
                    break;
                case 0 /* Managed */:
                    this._trackChanges(links);
                    break;
                default:
                    return callback(new Error("Unexpected object state in flush."));
            }
            links = next;
        }
        callback();
    };
    SessionImpl.prototype._close = function (callback) {
        var _this = this;
        this._queue.close();
        // flush and then clear the session
        this._flush(function (err) {
            if (err)
                return callback(err);
            _this._clear(callback);
        });
    };
    SessionImpl.prototype.fetchInternal = function (obj, paths, callback) {
        var _this = this;
        // TODO: when a reference is resolved do we update the referenced object? __proto__ issue.
        if (Reference.isReference(obj)) {
            obj.fetch(this, function (err, entity) {
                if (err)
                    return callback(err);
                _this._fetchPaths(entity, paths, callback);
            });
        }
        else {
            this._fetchPaths(obj, paths, callback);
        }
    };
    SessionImpl.prototype._fetchPaths = function (obj, paths, callback) {
        var links = this._getObjectLinks(obj);
        if (!links || links.state == 1 /* Detached */) {
            return callback(new Error("Object is not associated with the session."));
        }
        if (!paths || paths.length === 0) {
            process.nextTick(function () { return callback(null, obj); });
        }
        var persister = links.persister;
        async.each(paths, function (path, done) {
            persister.fetch(obj, path, done);
        }, function (err) {
            if (err)
                return callback(err);
            callback(null, obj);
        });
    };
    /**
     * Detaches all managed objects.
     * @param callback Callback to execute after operation completes.
     */
    SessionImpl.prototype._clear = function (callback) {
        for (var i = 0; i < this._objectLinks.length; i++) {
            var links = this._objectLinks[i];
            if (links) {
                // We call _cleanupUnlinkedObject instead of _unlinkObject because we clear the entire _objectLinks
                // list and _objectLinksById map so there is no need to remove the links individually.
                this._cleanupUnlinkedObject(links);
            }
        }
        // clear all object links
        this._objectLinksById = {};
        this._objectLinks = [];
        // clear scheduled operations
        this._scheduleHead = this._scheduleTail = null;
        process.nextTick(callback);
    };
    SessionImpl.prototype._getObjectLinks = function (obj) {
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
    };
    SessionImpl.prototype._linkObject = function (obj, persister) {
        var _id = obj["_id"];
        if (_id === undefined) {
            throw new Error("Object is missing identifier.");
        }
        var id = _id.toString();
        if (this._objectLinksById[id]) {
            throw new Error("Session already contains an entity with identifier '" + id + "'.");
        }
        var links = {
            state: 0 /* Managed */,
            flags: 0 /* None */,
            object: obj,
            persister: persister,
            index: this._objectLinks.length
        };
        this._objectLinksById[id] = links;
        this._objectLinks.push(links);
        return links;
    };
    SessionImpl.prototype._unlinkObject = function (links) {
        this._objectLinksById[links.object["_id"].toString()] = undefined;
        this._objectLinks[links.index] = undefined;
        this._cleanupUnlinkedObject(links);
    };
    SessionImpl.prototype._cleanupUnlinkedObject = function (links) {
        this._stopWatching(links);
        // if the object was never persisted, then clear it's identifier as well
        if (links.scheduledOperation == 1 /* Insert */) {
            this._clearIdentifier(links);
        }
    };
    SessionImpl.prototype._scheduleOperation = function (links, operation) {
        // TODO: maintain a count of scheduled operations by Root Mapping so query operations know if a flush is needed before query
        if (!links.scheduledOperation) {
            if (this._scheduleHead) {
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
    };
    SessionImpl.prototype._clearScheduledOperation = function (links) {
        if (!links.scheduledOperation) {
            return;
        }
        // remove links from the schedule
        if (links.prev) {
            links.prev.next = links.next;
        }
        else {
            this._scheduleHead = links.next;
        }
        if (links.next) {
            links.next.prev = links.prev;
        }
        else {
            this._scheduleTail = links.prev;
        }
        links.scheduledOperation = 0 /* None */;
    };
    SessionImpl.prototype._clearIdentifier = function (links) {
        delete links.object["_id"];
    };
    SessionImpl.prototype._findReferencedEntities = function (obj, flags, callback) {
        var mapping = this.factory.getMappingForObject(obj);
        if (!mapping) {
            process.nextTick(function () { return callback(new Error("Object type is not mapped as an entity.")); });
            return;
        }
        var entities = [], embedded = [];
        this._walk(mapping, obj, flags, entities, embedded, function (err) {
            if (err)
                return process.nextTick(function () { return callback(err); });
            return process.nextTick(function () { return callback(null, entities); });
        });
    };
    SessionImpl.prototype._walk = function (mapping, entity, flags, entities, embedded, callback) {
        var _this = this;
        var references = [];
        mapping.walk(this, entity, flags | 512 /* WalkEntities */, entities, embedded, references);
        async.each(references, function (reference, done) {
            reference.fetch(_this, function (err, entity) {
                if (err)
                    return done(err);
                _this._walk(reference.mapping, entity, flags, entities, embedded, done);
            });
        }, callback);
    };
    SessionImpl.prototype._getPersisterForObject = function (obj) {
        var mapping = this.factory.getMappingForObject(obj);
        if (mapping) {
            return this.getPersister(mapping);
        }
    };
    SessionImpl.prototype._getPersisterForConstructor = function (ctr) {
        var mapping = this.factory.getMappingForConstructor(ctr);
        if (mapping) {
            return this.getPersister(mapping);
        }
    };
    return SessionImpl;
})(events.EventEmitter);
module.exports = SessionImpl;
