/// <reference path="../typings/async.d.ts" />

import async = require("async");
import EntityMapping = require("./mapping/entityMapping");
import Collection = require("./driver/collection");
import Identifier = require('./id/identifier');
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import ChangeTracking = require("./mapping/changeTracking");
import IdentityGenerator = require("./id/identityGenerator");
import Batch = require("./batch");
import Callback = require("./core/callback");
import MappingError = require("./mapping/mappingError");
import Reference = require("./reference");
import PropertyFlags = require("./mapping/propertyFlags");
import Result = require("./core/result");
import Persister = require("./persister");
import Command = require("./core/command");
import Bulk = require("./driver/bulk");
import BulkWriteResult = require("./driver/bulkWriteResult");
import Changes = require("./mapping/changes");
import Map = require("./core/map");
import QueryDefinition = require("./query/queryDefinition");
import QueryKind = require("./query/queryKind");
import IteratorCallback = require("./core/iteratorCallback");
import Cursor = require("./driver/cursor");

interface FindOneQuery {

    criteria: any;
    fetchPaths?: string[];
}

interface FindAllQuery extends FindOneQuery {

    sortBy?: [string, number][];
    limitCount?: number;
    skipCount?: number;
}

interface FindEachQuery extends FindAllQuery {

    iterator: IteratorCallback<any>;
}

interface FindAndModifyOptions {
    safe?: any;
    remove?: boolean;
    upsert?: boolean;
    new?: boolean;
}

interface RemoveOptions {
    safe?: any;
    single?: boolean;
}

class PersisterImpl implements Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    private _findQueue: FindQueue;
    private _mapping: EntityMapping;
    private _collection: Collection;
    private _session: InternalSession;

    constructor(session: InternalSession, mapping: EntityMapping, collection: Collection) {

        this._session = session;
        this._mapping = mapping;
        this._collection = collection;

        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        if(!this._mapping.areDocumentsEqual(originalDocument, document)) {
            this._getCommand(batch).addReplace(document);
        }

        return new Result(null, document);
    }

    addInsert(batch: Batch, entity: any): Result<any> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        this._getCommand(batch).addInsert(document);
        return new Result(null, document);
    }

    addRemove(batch: Batch, entity: any): void {

        this._getCommand(batch).addRemove(entity["_id"]);
    }

    /**
     * Refreshes the managed entity with the state from the database, discarding any unwritten changes. The new
     * document is returned in the callback. There is no need to return the entity since the caller already has
     * the entity.
     * @param entity The entity to refresh.
     * @param callback The callback to call when method completes. The results parameter contains the new database
     * document.
     */
    refresh(entity: any, callback: ResultCallback<any>): void {

        this.findOneById(entity["_id"], (err, document) => {
            if (err) return callback(err);

            var errors: MappingError[] = [];
            this._mapping.refresh(this._session, entity, document, errors);
            if(errors.length > 0) {
                return callback(new Error("Error deserializing document:\n" + MappingError.createErrorMessage(errors)));
            }

            callback(null, document);
        });
    }

    resolve(entity: any, path: string, callback: Callback): void {

        if(typeof path !== "string") {
            return callback(new Error("Path must be a string."));
        }

        this._mapping.resolve(this._session, undefined, entity, path.split("."), 0, callback);
    }

    findInverseOf(id: any, path: string, callback: ResultCallback<any[]>): void {

        var property = this._mapping.getProperty(path);
        if(property === undefined) {
            return callback(new Error("Missing property '" + path + "'."));
        }

        var query = {};
        property.setFieldValue(query, id);

        this.findAll({ criteria: query }, callback);
    }

    findOneInverseOf(id: any, path: string, callback: ResultCallback<any>): void {

        var property = this._mapping.getProperty(path);
        if(property === undefined) {
            return callback(new Error("Missing property '" + path + "'."));
        }

        var query = {};
        property.setFieldValue(query, id);

        this.findOne(query, callback);
    }

    findOneById(id: Identifier, callback: ResultCallback<any>): void {

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loa ded but scheduled for delete so null should be returned.
        var entity = this._session.getObject(id);
        if (entity !== undefined) {
            return process.nextTick(() => callback(null, entity));
        }

        (this._findQueue || (this._findQueue = new FindQueue(this))).add(id, callback);
    }

    findOne(criteria: Object, callback: ResultCallback<any>): void {

        this._collection.findOne(criteria, (err, document) => {
            if (err) return callback(err);
            var result = this._loadOne(document);
            callback(result.error, result.value);
        });
    }

    findAll(query: FindAllQuery, callback: ResultCallback<any[]>): void {

        this._prepareFind(query).toArray((err, documents) => {
            if(err) return callback(err);

            var result = this._loadAll(documents);
            callback(result.error, result.value);
        });
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void {

        switch(query.kind) {
            case QueryKind.FindOne:
                this.findOne(query.criteria, this._fetchOne(query, callback));
                break;
            case QueryKind.FindOneById:
                this.findOneById(query.criteria, this._fetchOne(query, callback));
                break;
            case QueryKind.FindAll:
                this.findAll(query, this._fetchAll(query, callback));
                break;
            case QueryKind.FindEach:
                this._findEach(query, callback);
                break;
            case QueryKind.FindEachSeries:
                this._findEachSeries(query, callback);
                break;
            case QueryKind.FindOneAndRemove:
            case QueryKind.FindOneAndUpdate:
                this._findAndModify(query, callback);
                break;
            case QueryKind.RemoveOne:
            case QueryKind.RemoveAll:
                this._remove(query, callback);
                break;
        }
    }

    // TODO: optimize this function by using underlying cursor from core directly
    private _findEach(query: FindEachQuery, callback: Callback): void {

        var cursor = this._prepareFind(query);
        var iterator = this._fetchIterator(query);

        var completed = 0,
            started = 0,
            finished = false,
            self = this;

        // We process all buffered items in parallel. When the buffer is empty, we replenish the buffer. Repeat.
        replenish();

        function replenish() {
            // try to retrieve a document from the cursor
            cursor.nextObject((err: Error, item: any) => {
                if(err) return error(err);

                // if the document is null then the cursor is finished
                if (item == null) {
                    // if all items have been processed then call callback; otherwise, we'll check later in 'done'.
                    if (completed >= started) {
                        callback();
                    }
                    finished = true;
                    return;
                }

                // otherwise, process the item returned
                process(err, item);

                // then process the rest of the items in the buffer
                while(cursor.bufferedCount() > 0) {
                    cursor.nextObject(process);
                }
            });
        }

        function process(err: Error, item: any): void {
            if (err) return error(err);

            started++;

            // convert the document to an entity
            var result = self._loadOne(item);
            if(result.error) {
                return error(result.error);
            }

            // pass the entity to the iterator, and wait for done to be called
            iterator(result.value, Callback.onlyOnce(done));
        }

        function done(err: Error) {
            if (err) return error(err);

            completed++;
            // if all buffered items have been processed, check if the cursor is finished. if it's finished then
            // we are done; otherwise, replenish the buffer.
            if(cursor.bufferedCount() == 0 && completed >= started) {

                if(finished) return callback();
                replenish();
            }
        }

        function error(err: Error) {
            callback(err);
            callback = function () {}; // if called for error, make sure it can't be called again
        }
    }

    // TODO: optimize this function by using underlying cursor from core directly
    private _findEachSeries(query: FindEachQuery, callback: Callback): void {

        var cursor = this._prepareFind(query),
            iterator = this._fetchIterator(query),
            self = this;

        (function next(err?: Error) {
            if (err) return error(err);

            cursor.nextObject((err: Error, item: any) => {
                if (err) return error(err);

                if (item == null) {
                    return callback();
                }

                var result = self._loadOne(item);
                if(result.error) {
                    return error(result.error);
                }

                iterator(result.value, next);
            });
        })();

        function error(err: Error) {
            callback(err);
            callback = function () {}; // if called for error, make sure it can't be called again
        }
    }

    private _prepareFind(query: FindAllQuery): Cursor {

        var cursor = this._collection.find(query.criteria);
        var cursor = this._collection.find(query.criteria);

        if(query.sortBy !== undefined) {
            cursor.sort(query.sortBy);
        }

        if(query.skipCount !== undefined) {
            cursor.skip(query.skipCount);
        }

        if(query.limitCount !== undefined) {
            cursor.limit(query.limitCount);
        }

        return cursor;
    }

    private _findAndModify(query: QueryDefinition, callback: ResultCallback<any>): void {

        var options: FindAndModifyOptions = {};

        if(query.kind == QueryKind.FindOneAndRemove) {
            options.remove = true;
        }

        if(query.wantsUpdated && !options.remove) {
            options.new = true;
        }

        this._collection.findAndModify(query.criteria, query.sortBy, query.updateDocument, options, (err, document) => {
            if (err) return callback(err);

            // TODO: handle this
            // if options.new is false
            //      - if entity is managed then detach the entity
            //      - either way, load the entity detached using value returned
            // if options.new is true
            //      - if entity is managed then refresh entity using value returned
            //      - if entity is not managed then load entity
            // either way we should handle the fetchPaths options
        });
    }

    private _remove(query: QueryDefinition, callback: ResultCallback<number>): void {

        var options: RemoveOptions = {};

        if(query.kind == QueryKind.RemoveOne) {
            options.single = true;
        }

        this._collection.remove(query.criteria, options, (err: Error, response: any) => {
            if(err) return callback(err);
            callback(null, response.result.n);
        });
    }

    private _fetchOne(query: FindOneQuery, callback: ResultCallback<any>): ResultCallback<any> {

        if(!query.fetchPaths) {
            return callback;
        }

        return (err: Error, entity: any) => {
            if(err) return callback(err);
            this._session.fetchInternal(entity, query.fetchPaths, callback);
        }
    }

    private _fetchAll(query: FindAllQuery, callback: ResultCallback<any[]>): ResultCallback<any[]> {

        if(!query.fetchPaths) {
            return callback;
        }

        return (err: Error, entities: any) => {
            if(err) return callback(err);
            async.each(entities, (entity, done) => this._session.fetchInternal(entity, query.fetchPaths, done), err => {
                if(err) return callback(err);
                callback(null, entities);
            });
        }
    }

    private _fetchIterator(query: FindEachQuery): IteratorCallback<any[]> {

        if(!query.fetchPaths) {
            return query.iterator;
        }

        return (entity: any, done: (err?: Error) => void) => {

            this._session.fetchInternal(entity, query.fetchPaths, (err: Error, result: any) => {
                if(err) return done(err);
                query.iterator(result, done);
            });
        }
    }

    private _loadAll(documents: any[]): Result<any[]> {

        if(!documents || documents.length == 0) {
            return new Result(null, []);
        }

        var entities = new Array(documents.length);
        var j = 0;
        for(var i = 0, l = documents.length; i < l; i++) {
            var result = this._loadOne(documents[i]);
            if(result.error) {
                return new Result(result.error, null);
            }
            // Filter any null values from the result because null means the object is scheduled for remove
            if(result.value !== null) {
                entities[j++] = result.value;
            }
        }
        entities.length = j;
        return new Result(null, entities);
    }

    private _loadOne(document: any): Result<any> {

        var entity: any;

        if (!document) {
            entity = null;
        }
        else {
            // Check to see if object is already loaded. Note explicit check for undefined here. Null means
            // that the object is loaded but scheduled for delete so null should be returned.
            entity = this._session.getObject(document["_id"]);
            if (entity === undefined) {

                var errors: MappingError[] = [];
                entity = this._mapping.read(this._session, document, "", errors);
                if (errors.length > 0) {
                    return new Result(new Error("Error deserializing document:\n" + MappingError.createErrorMessage(errors)));
                }

                this._session.registerManaged(this, entity, document);
            }
        }

        return new Result(null, entity);
    }

    private _getCommand(batch: Batch): BulkOperationCommand {
        var id = this._mapping.inheritanceRoot.id;
        var command = <BulkOperationCommand>batch.getCommand(id);
        if(!command) {
            command = new BulkOperationCommand(this._collection);
            batch.addCommand(id, command);
        }
        return command;
    }

}

class BulkOperationCommand implements Command {

    collectionName: string;
    operation: Bulk;
    inserted: number;
    updated: number;
    removed: number;

    constructor(collection: Collection) {

        this.collectionName = collection.collectionName,
        this.operation = collection.initializeUnorderedBulkOp(),
        this.inserted = this.updated = this.removed = 0;
    }

    addInsert(document: any): void {

        this.inserted++;
        this.operation.insert(document);
        //console.log("INSERT: " + JSON.stringify(document, null, "\t"));
    }

    addReplace(document: any): void {

        var query: any = {
            _id: document["_id"]
        }

        this.updated++;
        this.operation.find(query).replaceOne(document);
        //console.log("REPLACE: " + JSON.stringify(document, null, "\t"));
    }

    addUpdate(id: any, changes: Changes): void {

        var query: any = {
            _id: id
        }

        this.updated++;
        this.operation.find(query).update(changes);
        //console.log("UPDATE: " + JSON.stringify(changes, null, "\t"));
    }

    addRemove(id: any): void {

        var query: any = {
            _id: id
        }

        this.removed++;
        this.operation.find(query).removeOne();
        //console.log("REMOVE: " + JSON.stringify(document, null, "\t"));
    }

    execute(callback: Callback): void {

        this.operation.execute((err: Error, result: BulkWriteResult) => {
            if(err) return callback(err);

            // TODO: provide more detailed error information
            if((result.nInserted || 0) != this.inserted) {
                return callback(new Error("Flush failed for collection '" + this.collectionName + "'. Expected to insert " + this.inserted + " documents but only inserted " + (result.nInserted || 0) + "."));
            }

            if((result.nModified || 0) != this.updated) {
                return callback(new Error("Flush failed for collection '" + this.collectionName + "'. Expected to update " + this.updated + " documents but only updated " + (result.nModified || 0) + "."));
            }

            if((result.nRemoved || 0) != this.removed) {
                return callback(new Error("Flush failed for collection '" + this.collectionName + "'. Expected to remove " + this.removed + " documents but only removed " + (result.nRemoved || 0) + "."));
            }

            callback();
        });
    }
}

class FindQueue {

    private _persister: PersisterImpl;
    private _ids: Identifier[];
    private _callbacks: Map<ResultCallback<any>>;

    constructor(persister: PersisterImpl) {
        this._persister = persister;
    }

    add(id: Identifier, callback: ResultCallback<any>): void {
        if(!this._ids) {
            // this is the first entry in the queue so create the queue and schedule processing on the next tick
            this._ids = [];
            this._callbacks = {};
            process.nextTick(() => this._process());
        }

        var key = id.toString();
        var existingCallback = this._callbacks[key];
        if(existingCallback === undefined) {
            this._ids.push(id);
            this._callbacks[key] = callback;
        }
        else {
            // this id is already in the queue so chain the callbacks
            this._callbacks[key] = ResultCallback.chain(callback, existingCallback);
        }
    }

    private _process(): void {

        // pull values local
        var callbacks = this._callbacks,
            ids = this._ids;

        // clear queue
        this._ids = this._callbacks = undefined;

        // check for simple case of only a single find in the queue
        if(ids.length == 1) {
            var id = ids[0],
                callback = callbacks[id.toString()]

            this._persister.findOne({ _id:  id }, (err, entity) => {
                if(err) return callback(err);

                if(!entity) {
                    return callback(new Error("Unable to find document with identifier '" + id.toString() + "'."));
                }
                callback(null, entity);
            });
            return;
        }

        this._persister.findAll({ criteria: { _id: { $in: ids }}}, (err, entities) => {
            if(err) return this._handleCallbacks(err);

            for(var i = 0, l = entities.length; i < l; i++) {
                var entity = entities[i];

                var id = entity["_id"].toString(),
                    callback = callbacks[id];

                callback(null, entity);
                // mark the callback as called
                callbacks[id] = undefined;
            }

            this._handleCallbacks();
        });
    }

    private _handleCallbacks(err?: Error): void {

        // pass error message to any callbacks that have not been called yet
        var callbacks = this._callbacks;
        for (var id in callbacks) {
            if (callbacks.hasOwnProperty(id)) {
                var callback = callbacks[id];
                if(callback) {
                    callback(err || new Error("Unable to find document with identifier '" + id + "'."));
                }
            }
        }
    }
}

export = PersisterImpl;