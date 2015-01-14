/// <reference path="../typings/async.d.ts" />

import async = require("async");
import EntityMapping = require("./mapping/entityMapping");
import Collection = require("./driver/collection");
import Identifier = require('./id/identifier');
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import InternalSessionFactory = require("./internalSessionFactory");
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

    private _factory: InternalSessionFactory;

    constructor(factory: InternalSessionFactory, public mapping: EntityMapping, public collection: Collection) {

        this._factory = factory;
        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any> {

        var errors: MappingError[] = [];
        var document = this.mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + this._getMappingErrorMessage(errors)));
        }

        if(!this.mapping.areDocumentsEqual(originalDocument, document)) {
            this._getCommand(batch).addReplace(document);
        }

        return new Result(null, document);
    }

    insert(batch: Batch, entity: any): Result<any> {

        var errors: MappingError[] = [];
        var document = this.mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + this._getMappingErrorMessage(errors)));
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
    refresh(session: InternalSession, entity: any, callback: ResultCallback<any>): void {

        // TODO: error when findOne can't find document?
        this.collection.findOne({ _id: entity["_id"] }, (err, document) => {
            if (err) return callback(err);

            var errors: MappingError[] = [];
            this.mapping.refresh(session, entity, document, errors);
            if(errors.length > 0) {
                return callback(new Error("Error deserializing document:\n" + this._getMappingErrorMessage(errors)));
            }

            callback(null, document);
        });
    }

    find(session: InternalSession, criteria: any): Cursor {

        return new Cursor(session, this, this.collection.find(criteria));
    }

    private _load(session: InternalSession, documents: any[]): Result<any[]> {

        if(!documents || documents.length == 0) {
            return new Result(null, []);
        }

        var entities = new Array(documents.length);
        var j = 0;
        for(var i = 0, l = documents.length; i < l; i++) {
            var result = this._loadOne(session, documents[i]);
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

    findOneById(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void {

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loaded but scheduled for delete so null should be returned.
        var entity = session.getObject(id);
        if (entity !== undefined) {
            return process.nextTick(() => callback(null, entity));
        }

        this.findOne(session, { _id: id }, callback);
    }

    findOne(session: InternalSession, criteria: any, callback: ResultCallback<any>): void {

        // TODO: error when findOne can't find document?
        this.collection.findOne(criteria, (err, document) => {
            if (err) return callback(err);
            this._loadOne(session, document).handleCallback(callback);
        });
    }

    private _loadOne(session: InternalSession, document: any): Result<any> {

        var entity: any;

        if (!document) {
            entity = null;
        }
        else {
            // Check to see if object is already loaded. Note explicit check for undefined here. Null means
            // that the object is loaded but scheduled for delete so null should be returned.
            entity = session.getObject(document["_id"]);
            if (entity === undefined) {

                var errors: MappingError[] = [];
                entity = this.mapping.read(session, document, "", errors);
                if (errors.length > 0) {
                    return new Result(new Error("Error deserializing document:\n" + this._getMappingErrorMessage(errors)));
                }

                session.registerManaged(this, entity, document);
            }
        }

        return new Result(null, entity);
    }

    walk(session: InternalSession, entity: any, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        this.mapping.walk(session, entity, flags, entities, embedded, references);

        // TODO: load references in batches grouped by root mapping
        async.each(references, (reference: Reference, done: (err?: Error) => void) => {

            var persister = this._factory.getPersisterForMapping(reference.mapping);

            persister.findOneById(session, reference.id, (err: Error, entity: any) => {
                if (err) return done(err);
                persister.walk(session, entity, flags, entities, embedded, done);
            });
        }, callback);
    }

    private _getMappingErrorMessage(errors: MappingError[]): string {

        var message: string[] = [];

        for(var i = 0, l = errors.length; i < l; i++) {
            var error = errors[i];

            message.push(error.path, ": ", error.message, "\n");
        }

        return message.join("");
    }

    private _getCommand(batch: Batch): BulkOperationCommand {
        var id = this.mapping.inheritanceRoot.id;
        var command = <BulkOperationCommand>batch.getCommand(id);
        if(!command) {
            command = new BulkOperationCommand(this.collection);
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