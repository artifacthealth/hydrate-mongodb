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

import PropertyFlags = require("./mapping/propertyFlags");

interface Reference {
    mapping: EntityMapping;
    id: Identifier;
    object: any;
    key: string;
}

class EntityPersister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    constructor(public factory: InternalSessionFactory, public mapping: EntityMapping, public collection: Collection) {

        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): any {

        var errors: MappingError[] = [];
        var visited: any[] = [];
        var document = this.mapping.write(entity, null, errors, visited);

        if(!this.mapping.areDocumentsEqual(originalDocument, document)) {
            batch.addReplace(document, this);
        }
        /*
        var changes = DocumentComparer.compare(originalDocument, document);
        if(changes.$set || changes.$unset) {
            batch.addUpdate(document["_id"], changes, this);
        }*/

        return document;
    }

    insert(batch: Batch, entity: any): any {

        var errors: MappingError[] = [];
        var visited: any[] = [];
        var document = this.mapping.write(entity, null, errors, visited);

        batch.addInsert(document, this);
        return document;
    }

    remove(batch: Batch, entity: any): void {

        batch.addRemove(entity["_id"], this);
    }

    load(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void {

        // check to see if object is already loaded
        var entity = session.getObject(id);
        if (entity) {
            return process.nextTick(() => callback(null, entity));
        }

        this.collection.findOne({ _id: id }, (err, document) => {
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

        // check to see if object is already loaded
        var entity = session.getObject(document["_id"]);
        if (entity) {
            return callback(null, entity);
        }

        var errors: MappingError[] = [];
        var entity = this.mapping.read(document, null, errors);
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

            this.load(session, reference.id, (err: Error, entity: any) => {
                if (err) return done(err);

                this.factory.getPersisterForMapping(reference.mapping)._walk(session, entity, flags, entities, embedded, done);
            });
        }, callback);
    }

}

export = EntityPersister;