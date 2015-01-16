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
import Reference = require("./mapping/reference")
import PropertyFlags = require("./mapping/propertyFlags");
import Cursor = require("./cursor");
import Result = require("./core/result");
import Persister = require("./persister");
import Command = require("./core/command");
import Bulk = require("./driver/bulk");
import BulkWriteResult = require("./driver/bulkWriteResult");
import Changes = require("./mapping/changes");

class PersisterImpl implements Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

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

    insert(batch: Batch, entity: any): Result<any> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        this._getCommand(batch).addInsert(document);
        return new Result(null, document);
    }

    remove(batch: Batch, entity: any): void {

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

        // TODO: error when findOne can't find document?
        this._collection.findOne({ _id: entity["_id"] }, (err, document) => {
            if (err) return callback(err);

            var errors: MappingError[] = [];
            this._mapping.refresh(this._session, entity, document, errors);
            if(errors.length > 0) {
                return callback(new Error("Error deserializing document:\n" + MappingError.createErrorMessage(errors)));
            }

            callback(null, document);
        });
    }

    find(criteria: any): Cursor {

        return new Cursor(this._session, this, this._collection.find(criteria));
    }

    private _load(documents: any[]): Result<any[]> {

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

    findOneById(id: Identifier, callback: ResultCallback<any>): void {

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loaded but scheduled for delete so null should be returned.
        var entity = this._session.getObject(id);
        if (entity !== undefined) {
            return process.nextTick(() => callback(null, entity));
        }

        this.findOne({ _id: id }, callback);
    }

    findOne(criteria: any, callback: ResultCallback<any>): void {

        // TODO: error when findOne can't find document?
        this._collection.findOne(criteria, (err, document) => {
            if (err) return callback(err);
            this._loadOne(document).handleCallback(callback);
        });
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

    walk(entity: any, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        this._mapping.walk(this._session, entity, flags, entities, embedded, references);

        // TODO: load references in batches grouped by root mapping
        async.each(references, (reference: Reference, done: (err?: Error) => void) => {

            var persister = this._session.getPersister(reference.mapping);
            persister.findOneById(reference.id, (err: Error, entity: any) => {
                if (err) return done(err);
                persister.walk(entity, flags, entities, embedded, done);
            });
        }, callback);
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

export = PersisterImpl;