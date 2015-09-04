/// <reference path="../typings/async.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/mongodb.d.ts" />

import mongodb = require("mongodb");
import stream = require("stream");

import async = require("async");
import EntityMapping = require("./mapping/entityMapping");
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
import Changes = require("./mapping/changes");
import Map = require("./core/map");
import QueryDefinition = require("./query/queryDefinition");
import QueryKind = require("./query/queryKind");
import IteratorCallback = require("./core/iteratorCallback");
import QueryDocument = require("./query/queryDocument");
import CriteriaBuilder = require("./query/criteriaBuilder");
import UpdateDocumentBuilder = require("./query/updateDocumentBuilder");
import ResolveContext = require("./mapping/resolveContext");
import ReadContext = require("./mapping/readContext");
import Observer = require("./observer");
import CallbackUtil = require("./core/callbackUtil");
import OrderDocument = require("./query/orderDocument");

interface FindOneQuery {

    criteria: any;
    fetchPaths?: string[];
}

interface FindAllQuery extends FindOneQuery {

    orderDocument?: OrderDocument[];
    limitCount?: number;
    skipCount?: number;
    batchSizeValue?: number;
}

interface FindEachQuery extends FindAllQuery {

    iterator: IteratorCallback<any>;
}

interface WriteOptions {
    w?: number;
    wtimeout?: number;
    j?: number;
}

interface FindAndModifyOptions extends WriteOptions {
    remove?: boolean;
    upsert?: boolean;
    new?: boolean;
}

interface RemoveOptions extends WriteOptions {
    single?: boolean;
}

interface UpdateOptions extends WriteOptions {
    multi?: boolean;
}

interface CountOptions {
    limit: number;
    skip: number;
}

class PersisterImpl implements Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    private _versioned: boolean;
    private _findQueue: FindQueue;
    private _mapping: EntityMapping;
    private _collection: mongodb.Collection;
    private _session: InternalSession;
    private _criteriaBuilder: CriteriaBuilder;
    private _updateDocumentBuilder: UpdateDocumentBuilder;

    constructor(session: InternalSession, mapping: EntityMapping, collection: mongodb.Collection) {

        this._session = session;
        this._mapping = mapping;
        this._collection = collection;

        var inheritanceRoot = (<EntityMapping>mapping.inheritanceRoot);
        this.changeTracking = inheritanceRoot.changeTracking;
        this.identity = inheritanceRoot.identity;
        this._versioned = inheritanceRoot.versioned;
    }

    dirtyCheck(batch: Batch, entity: Object, originalDocument: Object): Result<Object> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        if(!this._mapping.areDocumentsEqual(originalDocument, document)) {

            // update version field if versioned
            if(this._versioned) {
                // get the current version
                var version = this._mapping.getDocumentVersion(originalDocument);
                // increment the version if defined; otherwise, start at 1.
                this._mapping.setDocumentVersion(document, (version || 0) + 1);
            }

            this._getCommand(batch).addReplace(document, version);
        }

        return new Result(null, document);
    }

    addInsert(batch: Batch, entity: Object): Result<Object> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        // add version field if versioned
        if(this._versioned) {
            this._mapping.setDocumentVersion(document, 1);
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
    refresh(entity: any, callback: ResultCallback<Object>): void {

        this.findOneById(entity["_id"], (err, document) => {
            if (err) return callback(err);
            this._refreshFromDocument(entity, document, callback);
        });
    }

    watch(value: any, observer: Observer): void {
        this._mapping.watchEntity(value, observer);
    }

    private _refreshFromDocument(entity: Object, document: Object, callback: ResultCallback<Object>): void {

        var context = new ReadContext(this._session);
        this._mapping.refresh(context, entity, document);
        if(context.hasErrors) {
            return callback(new Error("Error deserializing document:\n" + context.getErrorMessage()));
        }

        callback(null, document);
    }

    fetch(entity: any, path: string, callback: Callback): void {

        if(typeof path !== "string") {
            return callback(new Error("Path must be a string."));
        }

        this._mapping.fetch(this._session, undefined, entity, path.split("."), 0, callback);
    }

    findInverseOf(entity: Object, path: string, callback: ResultCallback<any[]>): void {

        var query = this._prepareInverseQuery(entity, path, callback);
        if(query) {
            this._findAll({criteria: query}, callback);
        }
    }

    findOneInverseOf(entity: Object, path: string, callback: ResultCallback<any>): void {

        var query = this._prepareInverseQuery(entity, path, callback);
        if(query) {
            this.findOne(query, callback);
        }
    }

    /**
     * Returns a query for finding an inverse relationship. If an error occurs, the callback is called; otherwise,
     * the callback is not called and is left to the caller to handle. Note that the query prepared does not include
     * a discriminator but since we assume that ids are globally unique, this doesn't matter.
     * @param entity The entity that has the inverse relationship
     * @param path The map to the property in the entity that is the owning side of the relationship.
     * @param callback Callback called on error.
     */
    _prepareInverseQuery(entity: Object, path: string, callback: ResultCallback<any>): QueryDocument {

        var property = this._mapping.getProperty(path);
        if(property === undefined) {
            callback(new Error("Missing property '" + path + "'."));
            return null;
        }

        var id = (<any>entity)._id;
        if(id === undefined) {
            callback(new Error("Missing identifier on entity that is the inverse side of a relationship."));
            return null;
        }

        var query: QueryDocument = {};
        property.setFieldValue(query, id);
        return query;
    }

    findOneById(id: any, callback: ResultCallback<any>): void {

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loaded but scheduled for delete so null should be returned.
        var entity = this._session.getObject(id);
        if (entity !== undefined) {
            return process.nextTick(() => callback(null, entity));
        }

        // TODO: FindQueue should be shared by all persisters with the same collection?
        (this._findQueue || (this._findQueue = new FindQueue(this))).add(id, callback);
    }

    // TODO: findOne uses find under the hood in the mongodb driver. Consider optimizing to not use findOne function on mongodb driver.
    findOne(criteria: QueryDocument, callback: ResultCallback<any>): void {

        this._collection.findOne(criteria, (err, document) => {
            if (err) return callback(err);
            var result = this._loadOne(document);
            callback(result.error, result.value);
        });
    }

    findAll(criteria: QueryDocument, callback: ResultCallback<any[]>): void {

        this._findAll({ criteria: criteria }, callback);
    }

    private _findAll(query: FindAllQuery, callback: ResultCallback<any[]>): void {

        this._prepareFind(query).toArray((err, documents) => {
            if(err) return callback(err);

            var result = this._loadAll(documents);
            callback(result.error, result.value);
        });
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void {

        // TODO: change so the query definition is not modified. not sure where to move this to.

        // map query criteria if it's defined
        if(query.criteria) {
            query.criteria = (this._criteriaBuilder || (this._criteriaBuilder = new CriteriaBuilder(this._mapping)))
                                .build(query.criteria);

            // check if we got any error during build
            if(this._criteriaBuilder.error) {
                return callback(this._criteriaBuilder.error);
            }
        }

        // map update document if it's defined
        if(query.updateDocument) {
            query.updateDocument = (this._updateDocumentBuilder || (this._updateDocumentBuilder = new UpdateDocumentBuilder(this._mapping)))
                                        .build(query.updateDocument);

            // check if we got any error during build
            if(this._updateDocumentBuilder.error) {
                return callback(this._updateDocumentBuilder.error);
            }

            // increment version field if versioned
            if(this._versioned) {
                var fields = query.updateDocument["$inc"];
                if(!fields) {
                    fields = query.updateDocument["$inc"] = {};
                }
                this._mapping.setDocumentVersion(fields, 1);
            }
        }

        // map sorting
        if(query.sortValue) {
            var preparedOrder = this._prepareOrderDocument(query.sortValue);
            if(preparedOrder.error) {
                return callback(preparedOrder.error);
            }
            else {
                query.orderDocument = preparedOrder.value;
            }
        }

        switch(query.kind) {
            case QueryKind.FindOne:
                this.findOne(query.criteria, this._fetchOne(query, callback));
                break;
            case QueryKind.FindOneById:
                this.findOneById(query.id, this._fetchOne(query, callback));
                break;
            case QueryKind.FindAll:
                this._findAll(query, this._fetchAll(query, callback));
                break;
            case QueryKind.FindEach:
                this._findEach(query, callback);
                break;
            case QueryKind.FindEachSeries:
                this._findEachSeries(query, callback);
                break;
            case QueryKind.FindOneAndRemove:
            case QueryKind.FindOneAndUpdate:
                this._findOneAndModify(query, this._fetchOne(query, callback));
                break;
            case QueryKind.RemoveOne:
            case QueryKind.RemoveAll:
                this._remove(query, callback);
                break;
            case QueryKind.UpdateOne:
            case QueryKind.UpdateAll:
                this._update(query, callback);
                break;
            case QueryKind.Distinct:
                this._distinct(query, callback);
                break;
            case QueryKind.Count:
                this._count(query, callback);
                break;
        }
    }

    private _prepareOrderDocument(sorting: [string, number][]): Result<OrderDocument[]> {

        var order: OrderDocument[] = [];

        for(var i = 0; i < sorting.length; i++) {

            var sortTuple = sorting[i];

            // resolve field path
            var context = this._mapping.resolve(sortTuple[0]);
            if(context.error) {
                return new Result<OrderDocument[]>(context.error);
            }

            var sortDocument: OrderDocument = {};
            sortDocument[context.resolvedPath] = sortTuple[1];
            order.push(sortDocument);
        }

        return new Result(null, order);
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
                    // if all items have been processed then call callback; otherwise, set flag and we'll check
                    // later in 'done'.
                    if (completed >= started) {
                        callback();
                    }
                    finished = true;
                    return;
                }

                // otherwise, process the item returned then process the rest of the items in the buffer
                process(err, item);

                while((<any>cursor).bufferedCount() > 0) {
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
            iterator(result.value, CallbackUtil.onlyOnce(done));
        }

        function done(err: Error) {
            if (err) return error(err);

            completed++;
            // if all buffered items have been processed, check if the cursor is finished. if it's finished then
            // we are done; otherwise, replenish the buffer.
            if((<any>cursor).bufferedCount() == 0 && completed >= started) {

                if(finished) return callback();
                replenish();
            }
        }

        function error(err: Error) {
            cursor.close(null); // close the cursor since it may not be exhausted
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
            cursor.close(null); // close the cursor since it may not be exhausted
            callback(err);
            callback = function () {}; // if called for error, make sure it can't be called again
        }
    }

    private _prepareFind(query: FindAllQuery): mongodb.Cursor {

        var cursor = this._collection.find(query.criteria);

        if(query.orderDocument !== undefined) {
            cursor.sort(query.orderDocument);
        }

        if(query.skipCount !== undefined) {
            cursor.skip(query.skipCount);
        }

        if(query.limitCount !== undefined) {
            cursor.limit(query.limitCount);
        }

        if(query.batchSizeValue !== undefined) {
            cursor.batchSize(query.batchSizeValue);
        }

        return cursor;
    }

    private _findOneAndModify(query: QueryDefinition, callback: ResultCallback<Object>): void {

        var options: FindAndModifyOptions = {
            remove: query.kind == QueryKind.FindOneAndRemove,
            new: query.wantsUpdated
        }

        this._collection.findAndModify(query.criteria, query.orderDocument, query.updateDocument, options, (err, response) => {
            if (err) return callback(err);

            var document = response.value;
            if (!document) return callback(null); // no match for criteria

            // check if the entity is already in the session
            var entity = this._session.getObject(document["_id"]);
            if(entity !== undefined) {
                // We check to see if the entity is already in the session so we know if we need to refresh the
                // entity or not.
                var alreadyLoaded = true;
            }
            else {
                // If the entity is not in the session, then it will be loaded and added to the session as managed.
                // The state may be changed to Removed below.
                var result = this._loadOne(document);
                if (result.error) {
                    return callback(result.error);
                }
                entity = result.value;
            }

            // If the entity is not pending deletion, then see if we need to refresh the entity from the updated
            // document or notify the session that the entity is now removed.

            // Note that if the entity is pending deletion in the session then the callback will be called with null
            // for the result. This is a little funny but seems most consistent with other methods such as findOne.
            if(entity) {
                if (options.remove) {
                    // If entity was removed then notify the session that the entity has been removed from the
                    // database. Note that the remove operation is not cascaded.
                    this._session.notifyRemoved(result.value);
                }
                else if (options.new && alreadyLoaded) {
                    // If findAndModify returned the updated document and the entity was already part of the session
                    // before findAndModify was executed, then refresh the entity from the returned document. Note
                    // that the refresh operation is not cascaded.
                    this._refreshFromDocument(entity, document, (err: Error) => {
                        if(err) return callback(err);
                        callback(null, entity);
                    });
                    return;
                }
            }

            // Note that if the updated document is not returned, the old version of the entity will remain or be
            // loaded into the session. If the entity is saved then an error will occur because the version will
            // not match. This is most consistent with an entity being modified from outside of the session, which
            // is essentially what is happening if findOneAndUpdate is called without returning the new document. If a
            // user wants to see the old version of the document and then make changes, they can always call refresh
            // after findOneAndUpdate.
            callback(null, entity);
        });
    }

    private _remove(query: QueryDefinition, callback: ResultCallback<number>): void {

        var options: RemoveOptions = {
            single: query.kind == QueryKind.RemoveOne
        }

        this._collection.remove(query.criteria, options, (err: Error, response: any) => {
            if(err) return callback(err);
            callback(null, response.result.n);
        });
    }

    private _update(query: QueryDefinition, callback: ResultCallback<number>): void {

        var options: UpdateOptions = {
            multi: query.kind == QueryKind.UpdateAll
        }

        this._collection.update(query.criteria, query.updateDocument, options, (err: Error, response: any) => {
            if(err) return callback(err);
            callback(null, response.result.nModified);
        });
    }

    private _distinct(query: QueryDefinition, callback: ResultCallback<any[]>): void {

        // TODO: add options for readpreference

        var context = this._mapping.resolve(query.key);
        if(context.error) {
            return callback(context.error);
        }

        this._collection.distinct(context.resolvedPath, query.criteria, undefined, (err: Error, results: any[]) => {
            if(err) return callback(err);

            // read results based on property mapping
            var readContext = new ReadContext(this._session);

            for(var i = 0, l = results.length; i < l; i++) {
                readContext.path = context.resolvedPath;
                results[i] = context.resolvedMapping.read(readContext, results[i]);
                if (readContext.hasErrors) {
                    return callback(new Error("Error deserializing distinct values for: " + readContext.getErrorMessage()));
                }
            }

            callback(null, results);
        });
    }

    private _count(query: QueryDefinition, callback: ResultCallback<number>): void {

        // TODO: add options for readpreference

        var options: CountOptions = {
            limit: query.limitCount,
            skip: query.skipCount
        }

        this._collection.count(query.criteria, options, (err: Error, result: number) => {
            if(err) return callback(err);
            callback(null, result);
        });
    }

    private _fetchOne(query: FindOneQuery, callback: ResultCallback<any>): ResultCallback<any> {

        if(!query.fetchPaths) {
            return callback;
        }

        return (err: Error, entity: any) => {
            if(err) return callback(err);
            if(!entity) return callback(null);
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

    private _fetchIterator(query: FindEachQuery): IteratorCallback<Object> {

        if(!query.fetchPaths) {
            return query.iterator;
        }

        return (entity: any, done: (err?: Error) => void) => {
            if(!entity) return done();

            this._session.fetchInternal(entity, query.fetchPaths, (err: Error, result: any) => {
                if(err) return done(err);
                query.iterator(result, done);
            });
        }
    }

    private _loadAll(documents: any[]): Result<Object[]> {

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
            // Filter any null values from the result because null means the object is scheduled for removal
            if(result.value !== null) {
                entities[j++] = result.value;
            }
        }
        entities.length = j;
        return new Result(null, entities);
    }

    private _loadOne(document: any): Result<Object> {

        var entity: any;

        if (!document) {
            entity = null;
        }
        else {
            // Check to see if object is already loaded. Note explicit check for undefined here. Null means
            // that the object is loaded but scheduled for delete so null should be returned.
            entity = this._session.getObject(document["_id"]);
            if (entity === undefined) {

                var context = new ReadContext(this._session);
                entity = this._mapping.read(context, document);
                if (context.hasErrors) {
                    return new Result(new Error("Error deserializing document:\n" + context.getErrorMessage()));
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
            command = new BulkOperationCommand(this._collection, this._mapping);
            batch.addCommand(id, command);
        }
        return command;
    }

}

class BulkOperationCommand implements Command {

    collectionName: string;
    operation: mongodb.UnorderedBulkOperation;
    inserted: number;
    updated: number;
    removed: number;

    private _mapping: EntityMapping;

    constructor(collection: mongodb.Collection, mapping: EntityMapping) {

        this._mapping = mapping;
        this.collectionName = collection.collectionName,
        this.operation = collection.initializeUnorderedBulkOp(),
        this.inserted = this.updated = this.removed = 0;
    }

    addInsert(document: any): void {

        this.inserted++;
        this.operation.insert(document);
    }

    addReplace(document: any, version: number): void {

        var query: any = {
            _id: document["_id"]
        }

        if(version != null) {
            // TODO: adding the version to the query makes the query much slower. Couldn't figure out any way around it. Look into this.
            this._mapping.setDocumentVersion(query, version);
        }

        this.updated++;
        this.operation.find(query).replaceOne(document);
    }

    addUpdate(id: any, changes: Changes): void {

        var query: any = {
            _id: id
        }

        this.updated++;
        this.operation.find(query).update(changes);
    }

    addRemove(id: any): void {

        var query: any = {
            _id: id
        }

        this.removed++;
        this.operation.find(query).removeOne();
    }

    execute(callback: Callback): void {

        this.operation.execute((err: Error, result: mongodb.BulkWriteResult) => {
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
    private _ids: any[];
    private _callbacks: Map<ResultCallback<any>>;

    constructor(persister: PersisterImpl) {
        this._persister = persister;
    }

    add(id: any, callback: ResultCallback<any>): void {
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
            this._callbacks[key] = CallbackUtil.chain(callback, existingCallback);
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
                callback = callbacks[id.toString()];

            this._persister.findOne({ _id:  id }, (err, entity) => {
                if(err) return callback(err);

                if(!entity) {
                    return callback(new Error("Unable to find document with identifier '" + id.toString() + "'."));
                }
                callback(null, entity);
            });
            return;
        }

        this._persister.findAll({ _id: { $in: ids }}, (err, entities) => {
            if(!err) {
                for (var i = 0, l = entities.length; i < l; i++) {
                    var entity = entities[i];

                    var id = entity["_id"].toString(),
                        callback = callbacks[id];

                    callback(null, entity);
                    // mark the callback as called
                    callbacks[id] = undefined;
                }
            }

            // TODO: add test to make sure callbacks are called if document cannot be found

            // pass error message to any callbacks that have not been called yet
            for (var id in callbacks) {
                if (callbacks.hasOwnProperty(id)) {
                    var callback = callbacks[id];
                    if(callback) {
                        callback(err || new Error("Unable to find document with identifier '" + id + "'."));
                    }
                }
            }
        });
    }
}
/*
class QueryStream extends stream.Readable {

    private _cursor: Cursor;

    constructor(persister: PersisterImpl, cursor: Cursor) {
        super({ readableObjectMode : true });
        this._cursor = cursor;
    }

    _read(): void {

        this._cursor.nextObject((err: Error, item: any) => {
            if (err) return error(err);

            if (item == null) {
                // end of cursor
                this.push(null);
                return;
            }

            var result = self._loadOne(item);
            if(result.error) {
                return error(result.error);
            }

            this.push(result.value);
        });

        function error(err: Error) {
            this._cursor.close();  // close the cursor since it may not be exhausted
            this.emit('error', err);
        }
    }
}
*/
export = PersisterImpl;