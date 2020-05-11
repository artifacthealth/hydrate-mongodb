import * as async from "async";
import {Collection, MongoClient} from "mongodb";
import {Table} from "./core/table";
import {MappingRegistry} from "./mapping/mappingRegistry";
import {Session, InternalSession, SessionImpl} from "./session";
import {Constructor} from "./index";
import {Persister} from "./persister";
import {PersisterImpl} from "./persister";
import {MappingModel} from "./mapping/mappingModel";
import {EntityMapping} from "./mapping/entityMapping";
import {Logger} from "./config/configuration";
import {shallowClone, shallowEqual} from "./core/objectUtil";
import {Callback} from "./core/callback";
import {PersistenceError} from "./persistenceError";
import {Index} from "./mapping/index";

export interface SessionFactory {

    /**
     * The MongoDB database connection associated with this [SessionFactory].
     */
    connection: MongoClient;

    /**
     * Gets the MongoDB database collection for the specified Entity constructor.
     * @param ctr The constructor to get the collection for.
     */
    getCollection(ctr: Constructor<any>): Collection;

    /**
     * Creates a new database session.
     */
    createSession(): Session;
    /**
     * Creates any indexes, defined on the mappings, that do not already exist.
     * @param callback Called after the operation has completed.
     */
    createIndexes(callback: Callback): void;
    /**
     * Creates any indexes, defined on the mappings, that do not already exist.
     * @param options Options for creating indexes.
     * @param callback Called after the operation has completed.
     */
    createIndexes(options: CreateIndexesOptions, callback: Callback): void;
    /**
     * Drops all indexes for all collections managed by Hydrate. This includes indexes that were not created by Hydrate.
     * @param callback Called after the operation has completed.
     */
    dropIndexes(callback: Callback): void;
}

/**
 * Options for creating indexes.
 */
export interface CreateIndexesOptions {

    /**
     * If specified, indexes are created in the background; otherwise, the database is locked while indexes are created.
     */
    background?: boolean
}

/**
 * @hidden
 */
export interface InternalSessionFactory extends SessionFactory {

    logger: Logger;
    getMappingForObject(obj: any): EntityMapping;
    getMappingForConstructor(ctr: Constructor<any> | string): EntityMapping;
    createPersister(session: InternalSession, mapping: EntityMapping): Persister;
}

/**
 * @hidden
 */
export class SessionFactoryImpl implements InternalSessionFactory {

    connection: MongoClient;
    logger: Logger;

    private _collections: Table<Collection>;
    private _mappingRegistry: MappingRegistry;

    constructor(connection: MongoClient, collections: Table<Collection>, mappingRegistry: MappingRegistry) {

        this.connection = connection;
        this._collections = collections;
        // TODO: get rid of mapping registry and handle directly in session factory
        this._mappingRegistry = mappingRegistry;
    }

    createSession(): Session {

        return new SessionImpl(this);
    }

    getCollection(ctr: Constructor<any>): Collection {

        var mapping = this.getMappingForConstructor(ctr);
        if (!mapping) {
            throw new PersistenceError("Object type is not mapped as an entity.");
        }
        return this._collections[mapping.inheritanceRoot.id];
    }

    getMappingForObject(obj: any): EntityMapping {

        var mapping = this._mappingRegistry.getMappingForObject(obj);
        if(mapping && (mapping.flags & MappingModel.MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    getMappingForConstructor(ctr: Constructor<any> | string): EntityMapping {

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if(mapping && (mapping.flags & MappingModel.MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {

        return new PersisterImpl(session, mapping, this._collections[mapping.inheritanceRoot.id]);
    }

    createIndexes(callback: Callback): void;
    createIndexes(options: CreateIndexesOptions, callback: Callback): void;
    createIndexes(optionsOrCallback: any, callback?: Callback): void {

        var options: CreateIndexesOptions;

        if (typeof optionsOrCallback === "function") {
            callback = optionsOrCallback;
        }
        else {
            options = optionsOrCallback;
        }

        async.each(
            this._mappingRegistry.getEntityMappings(),
            (mapping, mappingDone) => {

                var inheritanceRoot = <EntityMapping>mapping.inheritanceRoot,
                    collection = this._collections[inheritanceRoot.id],
                    versioned = inheritanceRoot.versioned,
                    versionField = inheritanceRoot.versionField,
                    discriminatorField = inheritanceRoot.discriminatorField;

                async.each(
                    mapping.indexes || [],
                    (index, indexDone) => {

                        var indexOptions = shallowClone(index.options) || {};
                        if (options) {
                            indexOptions.background = options.background;
                        }

                        if (!Array.isArray(index.keys) || index.keys.length == 0) {
                            indexDone(new PersistenceError(`Missing or invalid keys on index for '${mapping.name}'.`));
                            return;
                        }

                        let keys = new Array(index.keys.length);

                        for (var i = 0; i < index.keys.length; i++) {
                            let propertyName = index.keys[i][0];
                            if (!propertyName) {
                                indexDone(new PersistenceError(`Missing or invalid key on index for '${mapping.name}'.`));
                                return;
                            }

                            let order = index.keys[i][1];
                            if (order !== 1 && order !== -1 && order != 'text') {
                                indexDone(new PersistenceError(`Invalid order for key '${propertyName}' on index for '${mapping.name}'. Order must be 1, -1, or 'text'.`));
                                return;
                            }

                            if (propertyName == "_id" || (versioned && propertyName == versionField) || propertyName == discriminatorField) {
                                // special case for the automatic fields
                                keys[i] = index.keys[i];
                            }
                            else {
                                let resolved = mapping.resolve(propertyName);
                                if (resolved.error) {
                                    indexDone(new PersistenceError(`Invalid key on index for '${mapping.name}': ${resolved.error.message}`));
                                    return;
                                }
                                keys[i] = [resolved.resolvedPath, order];
                            }
                        }

                        // check if this index is a prefix of any of the other indexes. if it is then it's redundant.
                        for (i = 0; i < mapping.indexes.length; i++) {

                            if (isPrefixIndex(index, mapping.indexes[i])) {
                                if (this.logger) {
                                    this.logger.trace(
                                        {
                                            collection: mapping.collectionName,
                                            index: {
                                                keys,
                                                options: indexOptions
                                            }
                                        },
                                        `[Hydrate] Skipping index '${getIndexName(index)}' because it's a prefix of '${getIndexName(mapping.indexes[i])} on '${collection.collectionName}' collection'.`);
                                }
                                process.nextTick(indexDone);
                                return;
                            }
                        }

                        // check if index is identical to an index after it in the list. if it is then it's redundant. we start after it in
                        // the list so at least one is added.
                        for (i = mapping.indexes.indexOf(index) + 1; i < mapping.indexes.length; i++) {

                            if (areIndexesEqual(index, mapping.indexes[i])) {
                                if (this.logger) {
                                    this.logger.trace(
                                        {
                                            collection: mapping.collectionName,
                                            index: {
                                                keys,
                                                options: indexOptions
                                            }
                                        },
                                        `[Hydrate] Skipping index '${getIndexName(index)}' because it's identical to '${getIndexName(mapping.indexes[i])} on '${collection.collectionName}' collection'.`);
                                }
                                process.nextTick(indexDone);
                                return;
                            }
                        }

                        collection.createIndex(keys, indexOptions, (err, indexName) => {
                            if (err) return indexDone(err);

                            if (this.logger) {
                                this.logger.trace(
                                    {
                                        collection: mapping.collectionName,
                                        index: {
                                            keys,
                                            options: indexOptions
                                        }
                                    },
                                    `[Hydrate] Ensured index '${indexName}' exists on '${collection.collectionName}' collection.`);
                            }

                            indexDone();
                        });
                    },
                    mappingDone)
            },
            callback);
    }

    /**
     * Drops all indexes for all collections managed by Hydrate. This includes indexes that were not created by Hydrate.
     * @param callback Called after the operation has completed.
     */
    dropIndexes(callback: Callback): void {

        async.each(
            this._mappingRegistry.getEntityMappings().filter(mapping => mapping.hasFlags(MappingModel.MappingFlags.InheritanceRoot)),
            (mapping, done) => {

                let collection = this._collections[mapping.id];
                if (collection) {
                    collection.dropIndexes((err: Error) => {
                        if (err) return done(err);

                        if (this.logger) {
                            this.logger.trace(
                                {
                                    collection: mapping.collectionName
                                },
                                `[Hydrate] Dropped all indexes on '${collection.collectionName}' collection.`);
                        }

                        done();
                    })
                }
            },
            callback);
    }
}

/**
* Returns true if index1 is a prefix of or equal to index2 but not the exact same index definition.
 */
function isPrefixIndex(index1: Index, index2: Index): boolean {

    if (index1 === index2) {
        return false;
    }

    // if index1 has the same or more keys than index2 then it's not a prefix.
    if (index1.keys.length >= index2.keys.length) {
        return false;
    }

    // make sure both indexes have the same options
    if (!shallowEqual(index1.options, index2.options)) {
        return false;
    }

    var key1: [string, number | string],
        key2: [string, number | string];

    for (var i = 0; i < index1.keys.length; i++) {

        key1 = index1.keys[i];
        key2 = index2.keys[i];

        if (key1[0] !== key2[0] || key1[1] !== key2[1]) {
            return false;
        }
    }

    return true;
}

/**
 * Returns true if index1 is equal to index2.
 */
function areIndexesEqual(index1: Index, index2: Index): boolean {

    if (index1 === index2) {
        return true;
    }

    if (index1.keys.length != index2.keys.length) {
        return false;
    }

    // make sure both indexes have the same options
    if (!shallowEqual(index1.options, index2.options)) {
        return false;
    }

    var key1: [string, number | string],
        key2: [string, number | string];

    for (var i = 0; i < index1.keys.length; i++) {

        key1 = index1.keys[i];
        key2 = index2.keys[i];

        if (key1[0] !== key2[0] || key1[1] !== key2[1]) {
            return false;
        }
    }

    return true;
}

function getIndexName(index: Index): string {

    return index.keys.map(x => x.join("_")).join("_");
}
