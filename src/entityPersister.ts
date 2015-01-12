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

class EntityPersister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    constructor(public factory: InternalSessionFactory, public mapping: EntityMapping, public collection: Collection) {

        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): any {

        var errors: MappingError[] = [];
        var document = this.mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Error("Error serializing document:\n" + this._getMappingErrorMessage(errors));
        }

        if(!this.mapping.areDocumentsEqual(originalDocument, document)) {
            batch.addReplace(document, this);
        }

        return document;
    }

    insert(batch: Batch, entity: any): any {

        var errors: MappingError[] = [];
        var document = this.mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Error("Error serializing document:\n" + this._getMappingErrorMessage(errors));
        }

        batch.addInsert(document, this);
        return document;
    }

    remove(batch: Batch, entity: any): void {

        batch.addRemove(entity["_id"], this);
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

            // TODO: read into the current entity
            this.mapping.read(document, "", errors);
            if(errors.length > 0) {
                return callback(new Error("Error deserializing document:\n" + this._getMappingErrorMessage(errors)));
            }

            callback(null, document);
        });
    }

    find(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void {

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loaded but scheduled for delete so null should be returned.
        var entity = session.getObject(id);
        if (entity !== undefined) {
            return process.nextTick(() => callback(null, entity));
        }

        this.load(session, { _id: id }, callback);
    }

    load(session: InternalSession, criteria: any, callback: ResultCallback<any>): void {

        // TODO: error when findOne can't find document?
        this.collection.findOne(criteria, (err, document) => {
            if (err) return callback(err);
            this._load(session, document, callback);
        });
    }

    // only call within async function
    private _load<T>(session: InternalSession, document: any, callback: ResultCallback<T>): void {

        // if the document is null or undefined then return undefined
        if (!document) {
            // note that we are not ensuring the callback is called async because _load will only
            // be called within an async function
            return callback(null);
        }

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loaded but scheduled for delete so null should be returned.
        var entity = session.getObject(document["_id"]);
        if (entity !== undefined) {
            return callback(null, entity);
        }

        var errors: MappingError[] = [];
        var entity = this.mapping.read(document, "", errors);
        if(errors.length > 0) {
            return callback(new Error("Error deserializing document:\n" + this._getMappingErrorMessage(errors)));
        }

        session.registerManaged(this, entity, document);
        callback(null, entity);
    }

    getReferencedEntities(session: InternalSession, obj: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {

        var entities: any[] = [],
            embedded: any[] = [];

        this._walk(session, obj, flags, entities, embedded, err => {
            if(err) return process.nextTick(() => callback(err));
            return process.nextTick(() => callback(null, entities));
        });
    }

    private _walk(session: InternalSession, entity: any, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        this.mapping.walk(session, entity, flags, entities, embedded, references);

        // TODO: load references in batches grouped by root mapping
        async.each(references, (reference: Reference, done: (err?: Error) => void) => {

            this.find(session, reference.id, (err: Error, entity: any) => {
                if (err) return done(err);

                this.factory.getPersisterForMapping(reference.mapping)._walk(session, entity, flags, entities, embedded, done);
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

}

export = EntityPersister;