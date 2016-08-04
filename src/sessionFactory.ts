import * as async from "async";
import {Collection} from "mongodb";
import {Table} from "./core/table";
import {MappingRegistry} from "./mapping/mappingRegistry";
import {Session, InternalSession, SessionImpl} from "./session";
import {Constructor} from "./index";
import {Persister} from "./persister";
import {PersisterImpl} from "./persister";
import {MappingModel} from "./mapping/mappingModel";
import {EntityMapping} from "./mapping/entityMapping";
import {Logger} from "./config/configuration";
import {shallowClone} from "./core/objectUtil";
import {Callback} from "./core/callback";

export interface SessionFactory {

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
    getMappingForConstructor(ctr: Constructor<any>): EntityMapping;
    createPersister(session: InternalSession, mapping: EntityMapping): Persister;
}

/**
 * @hidden
 */
export class SessionFactoryImpl implements InternalSessionFactory {

    logger: Logger;

    private _collections: Table<Collection>;
    private _mappingRegistry: MappingRegistry;

    constructor(collections: Table<Collection>, mappingRegistry: MappingRegistry) {

        this._collections = collections;
        // TODO: get rid of mapping registry and handle directly in session factory
        this._mappingRegistry = mappingRegistry;
    }

    createSession(): Session {

        return new SessionImpl(this);
    }

    getMappingForObject(obj: any): EntityMapping {

        var mapping = this._mappingRegistry.getMappingForObject(obj);
        if(mapping && (mapping.flags & MappingModel.MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    getMappingForConstructor(ctr: Constructor<any>): EntityMapping {

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

        var entityMappings = this._mappingRegistry.getEntityMappings();

        async.each(
            entityMappings.filter(mapping => mapping.hasFlags(MappingModel.MappingFlags.InheritanceRoot)),
            (mapping, mappingDone) => {

                async.each(
                    mapping.indexes || [],
                    (index, indexDone) => {

                        var indexOptions = shallowClone(index.options) || {};
                        if (options) {
                            indexOptions.background = options.background;
                        }

                        this._collections[mapping.id].ensureIndex(index.keys, indexOptions, (err, indexName) => {
                            if (err) return indexDone(err);

                            if (this.logger) {
                                this.logger.trace(
                                    {
                                        collection: mapping.collectionName,
                                        index
                                    },
                                    `[Hydrate] Ensured index '${indexName}' exists on '${mapping.collectionName}' collection.`);
                            }

                            indexDone();
                        });
                    },
                    mappingDone)
            },
            callback);
    }
}
