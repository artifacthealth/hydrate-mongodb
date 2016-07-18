import * as async from "async";
import * as mongodb from "mongodb";
import {NamingStrategy, NamingStrategies} from "./namingStrategies";
import {ResultCallback} from "../core/callback";
import {MappingRegistry} from "../mapping/mappingRegistry";
import {ChangeTrackingType} from "../mapping/mappingModel";
import {Table} from "../core/table";
import {MappingModel, PropertyConverter} from "../mapping/mappingModel";
import {SessionFactory, SessionFactoryImpl} from "../sessionFactory";
import {EntityMapping} from "../mapping/entityMapping";
import {ObjectIdGenerator} from "./objectIdGenerator";
import {ClassMapping} from "../mapping/classMapping";
import {PersistenceError} from "../persistenceError";

/**
 * Specifies default settings used to create the [[SessionFactory]].
 */
export class Configuration {

    /**
     * Default identity generator to use.
     */
    identityGenerator: IdentityGenerator = new ObjectIdGenerator();

    /**
     * True if entities are versioned by default; otherwise, false.
     */
    versioned = true;

    /**
     * Default field name to use for optimistic locking.
     */
    versionField = "__v";

    /**
     * Default field name to use for the class discriminator.
     */
    discriminatorField = "__t";

    /**
     * Default change tracking strategy to use.
     */
    changeTracking = ChangeTrackingType.DeferredImplicit;

    /**
     * If specified, prefix to add to all collection names.
     */
    collectionPrefix: string;

    /**
     * Naming strategy to use for collection names.
     */
    collectionNamingStrategy: NamingStrategy = NamingStrategies.CamelCase;

    /**
     * Naming strategy to use for field names.
     */
    fieldNamingStrategy: NamingStrategy = NamingStrategies.CamelCase;

    /**
     * Naming strategy to use for the discriminator value of a class.
     */
    discriminatorNamingStrategy: NamingStrategy = NamingStrategies.None;

    /**
     * Named property converters.
     */
    propertyConverters: { [name: string]: PropertyConverter } = {};

    /**
     * @hidden
     */
    private _mappings: MappingProvider[] = [];

    /**
     * Adds a mapping provider to the configuration.
     * @param mapping The mapping provider to use.
     */
    addMapping(mapping: MappingProvider): void {

        this._mappings.push(mapping);
    }

    /**
     * Creates a session factory.
     * @param connection The MongoDB connection to use.
     * @param callback Called once the session factory is created.
     */
    createSessionFactory(connection: mongodb.Db, callback: ResultCallback<SessionFactory>): void {

        var registry = new MappingRegistry();

        if(!this._mappings || this._mappings.length == 0) {
            return callback(new PersistenceError("No mappings were added to the configuration."));
        }

        // Get the mappings from the mapping providers
        async.each(this._mappings, (provider, done) => {

            provider.getMapping(this, (err, r) => {
                if(err) return done(err, null);

                // Merge all registries. Duplicates will cause an error.
                registry.addMappings(<ClassMapping[]>r);
                done(null, null);
            });
        }, (err) => {
            if(err) return callback(err);

            this._buildCollections(connection, registry, (err, collections) => {
                if(err) return callback(err);

                callback(null, new SessionFactoryImpl(collections, registry));
            });
        });
    }

    /**
     * @hidden
     */
    private _buildCollections(connection: mongodb.Db, registry: MappingRegistry, callback: ResultCallback<Table<mongodb.Collection>>): void {

        // Get all the collections and make sure they exit. We can also use this as a chance to build the
        // collection if it does not exist.
        var collections: Table<mongodb.Collection> = [];
        var namesSeen: Map<string, boolean> = new Map();

        async.each(registry.getEntityMappings(), (mapping: EntityMapping, callback: (err?: Error) => void) => {

            var localConnection = connection;

            if(!(mapping.flags & MappingModel.MappingFlags.InheritanceRoot)) return done();

            // make sure we have a collection name
            if (!mapping.collectionName) {
                return done(new PersistenceError("Missing collection name on mapping for type '" + mapping.name + "'."));
            }

            // make sure db/collection is not mapped to some other type.
            var key = [(mapping.databaseName || localConnection.databaseName), "/", mapping.collectionName].join("");
            if (namesSeen.has(key)) {
                return done(new PersistenceError("Duplicate collection name '" + key + "' on type '" + mapping.name + "' ."));
            }
            namesSeen.set(key, true);

            // change current database if a databaseName was specified in the mapping
            if(mapping.databaseName && mapping.databaseName !== localConnection.databaseName) {
                localConnection = localConnection.db(mapping.databaseName);
            }

            localConnection.listCollections({ name: mapping.collectionName }).toArray((err: Error, names: string[]): void => {
                if(err) return done(err);

                if(names.length == 0) {
                    // TODO: disable this in production (because of race condition. Return error if collection does not exist.)
                    // collection does not exist, create it
                    localConnection.createCollection(mapping.collectionName, mapping.collectionOptions || {}, (err, collection) => {
                        if(err) return done(err);
                        collections[mapping.id] = collection;
                        // TODO: create indexes for newly created collection (except in production)
                        done();
                    });
                }
                else {
                    // collection exists, get it
                    localConnection.collection(mapping.collectionName, { strict: true }, (err: Error, collection: mongodb.Collection) => {
                        if(err) return done(err);
                        collections[mapping.id] = collection;
                        done();
                    });
                }

            });

            function done(err?: Error): void {
                process.nextTick(() => {
                    callback(err);
                });
            }
        }, (err) => {
            if(err) return callback(err);
            callback(null, collections);
        });
    }
}

export interface IdentityGenerator {

    generate(): any;
    fromString(text: string): any;
    validate(value: any): boolean;
    areEqual(first: any, second: any): boolean;

    // TODO: serialize and deserialize methods on IdentityGenerator? e.g. Perhaps UUID is a class when assigned to an
    // entity but is serialized to a string when stored in the database.
}

/**
 * Describes a type that is able to convert an entity or embeddable property value to a MongoDB document field and back.
 *
 * ### Example
 *
 * The example below defines a PropertyConverter that converts an instance of a Point class to a string.
 * ```typescript
 *  class PointConverter implements PropertyConverter {
 *
 *      convertToDocumentField(property: any): any {
 *          if(property instanceof Point) {
 *              return [property.x, property.y].join(",");
 *          }
 *      }
 *
 *      convertToObjectProperty(field: any): any {
 *          if(typeof field === "string") {
 *              var parts = field.split(",");
 *              return new Point(parts[0], parts[1]);
 *         }
 *      }
 *  }
 *  ```
 */
export interface PropertyConverter {

    convertToDocumentField(property: any): any;
    convertToObjectProperty(field: any): any;
}

/**
 * Provides data mappings to the Configuration.
 */
export interface MappingProvider {

    /**
     * Gets a list of ClassMappings.
     * @param config The configuration to use for the mappings.
     * @param callback Called with a list of ClassMappings.
     */
    getMapping(config: Configuration, callback: ResultCallback<MappingModel.ClassMapping[]>): void;
}
