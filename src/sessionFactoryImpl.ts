/// <reference path="../typings/mongodb.d.ts" />
import {Collection, Db} from "mongodb";

import {Table} from "./core/table";
import {MappingRegistry} from "./mapping/mappingRegistry";
import {Session} from "./session";
import {SessionImpl} from "./sessionImpl";
import {InternalSessionFactory} from "./internalSessionFactory";
import {InternalSession} from "./internalSession";
import {Constructor} from "./core/constructor";
import {Persister} from "./persister";
import {PersisterImpl} from "./persisterImpl";
import {MappingFlags} from "./mapping/mappingFlags";
import {EntityMapping} from "./mapping/entityMapping";
import {ResultCallback} from "./core/resultCallback";

export class SessionFactoryImpl implements InternalSessionFactory {

    private _connection: Db;
    private _collections: Table<Promise<Collection>> = [];
    private _collectionNames: Set<string> = new Set();
    private _mappingRegistry: MappingRegistry;

    constructor(connection: Db, mappingRegistry: MappingRegistry) {

        this._connection = connection;
        this._mappingRegistry = mappingRegistry;
    }

    createSession(): Session {

        return new SessionImpl(this);
    }

    getMappingForObject(obj: any, callback: ResultCallback<EntityMapping>): void {

        this._mappingRegistry.getMappingForObject(obj, (err, mapping) => {
            if (mapping && (mapping.flags & MappingFlags.Entity)) {
                callback(null, <EntityMapping>mapping);
                return;
            }

            callback(new Error("Type of object is not mapped as an entity."));
        });
    }

    getMappingForConstructor(ctr: Constructor<any>, callback: ResultCallback<EntityMapping>): void {

        this._mappingRegistry.getMappingForConstructor(ctr, (err, mapping) => {
            if(mapping && (mapping.flags & MappingFlags.Entity)) {
                callback(null, <EntityMapping>mapping);
                return;
            }

            callback(new Error("Type is not mapped as an entity."));
        });
    }

    createPersister(session: InternalSession, mapping: EntityMapping, callback: ResultCallback<Persister>): void {

        this._getCollection(<EntityMapping>mapping.inheritanceRoot, (err, collection) => {
            if(err) return callback(err);

            callback(null, new PersisterImpl(session, mapping, collection));
        });
    }

    private _getCollection(mapping: EntityMapping, callback: ResultCallback<Collection>): void {

        var promise = this._collections[mapping.id];
        if(!promise) {
            promise = new Promise((resolve, reject) => {
                this._createCollection(mapping, (err, collection) => {
                    if (err) return reject(err);

                    resolve(collection);
                });
            });
            this._collections[mapping.id] = promise;
        }

        promise.then((collection) => callback(null, collection), (err) => callback(err));
    }

    private _createCollection(mapping: EntityMapping, callback: ResultCallback<Collection>): void {

        // copy connection to local variable because we might change that database
        var connection = this._connection;

        if(!(mapping.flags & MappingFlags.InheritanceRoot)) {
            callback(new Error(`Cannot determine collection for '${mapping.name}' because it is not a root entity.`));
            return;
        }

        // make sure we have a collection name
        if (!mapping.collectionName) {
            callback(new Error(`Missing collection name on mapping for type '${mapping.name}'.`));
            return;
        }

        // make sure db/collection is not mapped to some other type.
        var key = [(mapping.databaseName || connection.databaseName), "/", mapping.collectionName].join("");
        if (this._collectionNames.has(key)) {
            callback(new Error(`Duplicate collection name '${key}' on type '${mapping.name}'.`));
            return;
        }
        this._collectionNames.add(key);

        // change current database if a databaseName was specified in the mapping
        if(mapping.databaseName && mapping.databaseName !== connection.databaseName) {
            connection = connection.db(mapping.databaseName);
        }

        // TODO: This check to create the collection should be turned off in production because of race condition
        connection.listCollections({ name: mapping.collectionName }).toArray((err: Error, names: string[]): void => {
            if(err) return callback(err);

            if(names.length == 0) {
                // collection does not exist, create it
                connection.createCollection(mapping.collectionName, mapping.collectionOptions || {}, (err, collection) => {
                    if(err) return callback(err);
                    // TODO: create indexes for newly created collection (turned off in production)
                    callback(null, collection);
                });
            }
            else {
                // collection exists, get it
                connection.collection(mapping.collectionName, { strict: true }, (err: Error, collection: Collection) => {
                    if(err) return callback(err);
                    callback(null, collection);
                });
            }
        });
    }
}
