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
import Cursor = require("./cursor");
import DriverCursor = require("./driver/cursor");
import Result = require("./core/result");
import Persister = require("./persister");
import Command = require("./core/command");
import Bulk = require("./driver/bulk");
import BulkWriteResult = require("./driver/bulkWriteResult");
import Changes = require("./mapping/changes");
import Map = require("./core/map");

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

    findAll(criteria: any): Cursor<any> {

        return new CursorImpl(this, this._collection.find(criteria));
    }

    load(documents: any[]): Result<any[]> {

        if(!documents || documents.length == 0) {
            return new Result(null, []);
        }

        var entities = new Array(documents.length);
        var j = 0;
        for(var i = 0, l = documents.length; i < l; i++) {
            var result = this.loadOne(documents[i]);
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
            this.loadOne(document).handleCallback(callback);
        });
    }

    loadOne(document: any): Result<any> {

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

    findInverseOf(id: any, path: string, callback: ResultCallback<any[]>): void {

        var property = this._mapping.getProperty(path);
        if(property === undefined) {
            return callback(new Error("Missing property '" + path + "'."));
        }

        var query = {};
        property.setFieldValue(query, id);

        this.findAll(query).toArray(callback);
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

    findOneAndRemove(criteria: Object, sort: [string, number][], callback: ResultCallback<any>): void {

    }

    findOneAndUpdate(criteria: Object, sort: [string, number][], returnNew: boolean, updateDocument: Object, callback: ResultCallback<any>): void {

    }

    distinct(key: string, criteria: Object, callback: ResultCallback<any[]>): void {

    }

    count(criteria: Object, limit: number, skip: number, callback: ResultCallback<number>): void {

    }

    removeAll(criteria: Object, callback?: ResultCallback<number>): void {

    }

    removeOne(criteria: Object, callback?: Callback): void {

    }

    updateAll(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void {

    }

    updateOne(criteria: Object, updateDocument: Object, callback?: Callback): void {

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

        this._persister.findAll({ _id: { $in: ids }}).forEach((entity) => {
            var id = entity["_id"].toString(),
                callback = callbacks[id];

            callback(null, entity);
            // mark the callback as called
            callbacks[id] = undefined;
        },
        (err) => {
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

class CursorImpl implements Cursor<any> {

    private _persister: PersisterImpl;
    private _cursor: DriverCursor;

    constructor(persister: PersisterImpl, cursor: DriverCursor) {
        this._persister = persister;
        this._cursor = cursor;
    }

    filter(filter: any): Cursor<any> {

        this._cursor.filter(filter);
        return this;
    }

    sort(list: any): Cursor<any>;
    sort(key: string, direction: number): Cursor<any>;
    sort(keyOrList: any, direction?: number): Cursor<any> {

        this._cursor.sort(keyOrList, direction);
        return this;
    }

    limit(value: number): Cursor<any> {

        this._cursor.limit(value);
        return this;
    }

    skip(value: number): Cursor<any> {

        this._cursor.skip(value);
        return this;
    }

    nextObject(callback: (err: Error, entity?: any) => void): void {

        this._cursor.nextObject((err, document) => {
            if (err) return callback(err, undefined);
            var result = this._persister.loadOne(document);
            if (result.error) {
                return callback(result.error);
            }
            callback(null, result.value);
        });
    }

    each(callback: (err: Error, entity?: any) => boolean): void {

        this._cursor.each((err, document) => {
            if (err) return callback(err, undefined);
            var result = this._persister.loadOne(document);
            if (result.error) {
                return callback(result.error);
            }
            callback(null, result.value);
        });
    }

    forEach(iterator: (entity: any) => void, callback: (err: Error) => void): void {

        this._cursor.forEach((document) => {
            var result = this._persister.loadOne(document);
            if (result.error) {
                return callback(result.error);
            }
            iterator(result.value);
        }, callback);
    }

    toArray(callback: (err: Error, results?: any[]) => void): void {

        this._cursor.toArray((err, documents) => {
            if (err) return callback(err, undefined);

            var result = this._persister.load(documents);
            if (result.error) {
                return callback(result.error);
            }
            callback(null, result.value);
        });
    }

    count(callback: (err: Error, result: number) => void): void {

        this._cursor.count(false, callback);
    }

    close(callback: (err: Error) => void): void {

        this._cursor.close(callback);
    }

    isClosed(): boolean {

        return this._cursor.isClosed();
    }

    rewind(): Cursor<any> {

        this._cursor.rewind();
        return this;
    }

    fetch(path: string | string[]): Cursor<any> {
        return this;
    }
}

export = PersisterImpl;