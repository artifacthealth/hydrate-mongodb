import * as async from "async";
import {Collection, MongoClient, Db} from "mongodb";
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
     * The default database name to use.
     */
    databaseName: string;

    /**
     * Default identity generator to use.
     */
    identityGenerator: IdentityGenerator = new ObjectIdGenerator();

    /**
     * True if entities are versioned by default; otherwise, false.
     */
    versioned = true;

    /**
     * True if null values should be saved for properties by default; otherwise, false.
     */
    nullable = false;

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
     * A logger that conforms for the [bunyan](https://www.npmjs.com/package/bunyan) logger interface. If specified, all executed queries
     * and other debug information will be logged using the TRACE logging level.
     */
    logger: Logger;

    /**
     * Indicates if any missing indexes should be created when the [[SessionFactory]] is created. This is turned off by default.
     */
    createIndexes: boolean;

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
    createSessionFactory(connection: MongoClient, callback: ResultCallback<SessionFactory>): void;
    /**
     * Creates a session factory.
     * @param connection The MongoDB connection to use.
     * @param databaseName The name of the default database. If not specified, the database name must be specified in either the
     * [[Configuration]] or the Collection decorator.
     * @param callback Called once the session factory is created.
     */
    createSessionFactory(connection: MongoClient, databaseName: string,callback: ResultCallback<SessionFactory>): void;

    createSessionFactory(connection: MongoClient, callbackOrDatabaseName: any, callback?: ResultCallback<SessionFactory>): void {

        var registry = new MappingRegistry(),
            databaseName: string;

        if (typeof callbackOrDatabaseName === "function") {
            callback = callbackOrDatabaseName;
        }
        else {
            databaseName = callbackOrDatabaseName;
        }

        if(!this._mappings || this._mappings.length == 0) {
            return callback(new PersistenceError("No mappings were added to the configuration."));
        }

        // Get the mappings from the mapping providers
        async.each(this._mappings, (provider, done) => {

            provider.getMapping(this, (err, r) => {
                if(err) return done(err);

                // Merge all registries. Duplicates will cause an error.
                registry.addMappings(<ClassMapping[]>r);
                done();
            });
        }, (err) => {
            if(err) return callback(err);

            this._buildCollections(connection, databaseName, registry, (err, collections) => {
                if(err) return callback(err);

                let factory = new SessionFactoryImpl(connection, collections, registry);
                factory.logger = this.logger;

                // see if creating indexes is enabled
                if (!this.createIndexes) {
                    callback(null, factory);
                }
                else {
                    factory.createIndexes((err) => {
                        if (err) return callback(err);
                        callback(null, factory);
                    });
                }
            });
        });
    }

    /**
     * @hidden
     */
    private _buildCollections(connection: MongoClient, databaseName: string, registry: MappingRegistry, callback: ResultCallback<Table<Collection>>): void {

        // Get all the collections and make sure they exit. We can also use this as a chance to build the
        // collection if it does not exist.
        var collections: Table<Collection> = [];
        var namesSeen = new Map<string, boolean>();

        async.each(registry.getEntityMappings(), (mapping: EntityMapping, callback: (err?: Error) => void) => {

            if(!(mapping.flags & MappingModel.MappingFlags.InheritanceRoot)) {
                process.nextTick(done);
                return;
            }

            // make sure we have a collection name
            if (!mapping.collectionName) {
                return done(new PersistenceError("Missing collection name on mapping for type '" + mapping.name + "'."));
            }

            var dbName = mapping.databaseName || databaseName || this.databaseName;
            if (!dbName) {
                return callback(new Error(`Could not determine database name for '${mapping.collectionName}'. Please make sure to specify `
                    + "the database name in either the Configuration, the call to createSessionFactory, or the @Collection decorator."));
            }

            // make sure db/collection is not mapped to some other type.
            var key = dbName + "/" + mapping.collectionName;
            if (namesSeen.has(key)) {
                return done(new PersistenceError("Duplicate collection name '" + key + "' on type '" + mapping.name + "' ."));
            }
            namesSeen.set(key, true);

            var db = connection.db(dbName);

            db.listCollections({ name: mapping.collectionName }).toArray((err: Error, names: string[]): void => {
                if(err) return done(err);

                if(names.length == 0) {
                    db.createCollection(mapping.collectionName, mapping.collectionOptions || {}, (err, collection) => {
                        if(err) return done(err);
                        collections[mapping.id] = collection;
                        done();
                    });
                }
                else {
                    // collection exists, get it
                    db.collection(mapping.collectionName, { strict: true }, (err: Error, collection: Collection) => {
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

    /**
     * Converts an object property value to a document field value.
     * @param property The property value to convert.
     */
    convertToDocumentField(property: any): any;

    /**
     * Converts a document field value to an object property value.
     * @param field The field value to convert.
     */
    convertToObjectProperty(field: any): any;

    /**
     * Returns true if the document field values are equal; otherwise, returns false. This method is only called if both values are not
     * null and the values are not strictly equal.
     * @param field1 First document field value.
     * @param field2 Other document field value.
     */
    areEqual(field1: any, field2: any): boolean;
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



/**
 * A logger that conforms for the [bunyan](https://www.npmjs.com/package/bunyan) logger interface.
 */
export interface Logger {
    /**
     * Creates a child logger with the given options.
     * @param options Logger options.
     */
    child(options: LoggerOptions): Logger;

    /**
     * Creates a log record with the TRACE log level.
     * @param error The error to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    trace(error: Error, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the TRACE log level.
     * @param fields Set of additional fields to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    trace(fields: Object, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the TRACE log level.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    trace(msg: string, ...params: any[]): void;

    /**
     * Creates a log record with the DEBUG log level.
     * @param error The error to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    debug(error: Error, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the DEBUG log level.
     * @param fields Set of additional fields to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    debug(fields: Object, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the DEBUG log level.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    debug(msg: string, ...args: any[]): void;

    /**
     * Creates a log record with the INFO log level.
     * @param error The error to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    info(error: Error, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the INFO log level.
     * @param fields Set of additional fields to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    info(fields: Object, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the INFO log level.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    info(msg: string, ...args: any[]): void;

    /**
     * Creates a log record with the WARN log level.
     * @param error The error to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    warn(error: Error, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the WARN log level.
     * @param fields Set of additional fields to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    warn(fields: Object, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the WARN log level.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    warn(msg: string, ...args: any[]): void;

    /**
     * Creates a log record with the ERROR log level.
     * @param error The error to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    error(error: Error, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the ERROR log level.
     * @param fields Set of additional fields to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    error(fields: Object, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the ERROR log level.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    error(msg: string, ...args: any[]): void;

    /**
     * Creates a log record with the FATAL log level.
     * @param error The error to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    fatal(error: Error, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the FATAL log level.
     * @param fields Set of additional fields to log.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    fatal(fields: Object, msg?: string, ...args: any[]): void;
    /**
     * Creates a log record with the FATAL log level.
     * @param msg Log message. This can be followed by additional arguments for printf-like formatting.
     */
    fatal(msg: string, ...args: any[]): void;
}

/**
 * Logger options.
 */
export interface LoggerOptions {

    /**
     * Dictionary of custom serializers. The key is the name of the property that is serialized and the the value
     * is a function that takes an object and returns a JSON serializable value.
     */
    serializers?: {
        [key: string]: (input: any) => any;
    }
}
