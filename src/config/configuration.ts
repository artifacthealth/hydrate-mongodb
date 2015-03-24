/// <reference path="../../typings/async.d.ts" />
/// <reference path="../../typings/mongodb.d.ts" />

import async = require("async");
import mongodb = require("mongodb");

import ResultCallback = require("../core/resultCallback");
import MappingProvider = require("../mapping/providers/mappingProvider");
import MappingRegistry = require("../mapping/mappingRegistry");
import ChangeTracking = require("../mapping/changeTracking")
import Table = require("../core/table");
import MappingFlags = require("../mapping/mappingFlags");
import SessionFactory = require("../sessionFactory");
import SessionFactoryImpl = require("../sessionFactoryImpl");
import IdentityGenerator = require("../id/identityGenerator");
import Map = require("../core/map");
import EntityMapping = require("../mapping/entityMapping");
import NamingStrategy = require("./namingStrategy");
import ObjectIdGenerator = require("../id/objectIdGenerator");

class Configuration {

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
    changeTracking = ChangeTracking.Observe;

    /**
     * Naming strategy to use for collection names.
     */
    collectionNamingStrategy = NamingStrategy.CamelCase;

    /**
     * Naming strategy to use for field names.
     */
    fieldNamingStrategy = NamingStrategy.CamelCase;

    /**
     * Naming strategy to use for the discriminator value of a class.
     */
    discriminatorNamingStrategy = NamingStrategy.None;


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
            return callback(new Error("No mappings were added to the configuration."));
        }

        // Get the mappings from the mapping providers
        async.each(this._mappings, (provider, done) => {

            provider.getMapping(this, (err, r) => {
                if(err) return done(err, null);

                // Merge all registries. Duplicates will cause an error.
                registry.merge(r);
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

    private _buildCollections(connection: mongodb.Db, registry: MappingRegistry, callback: ResultCallback<Table<mongodb.Collection>>): void {

        // Get all the collections and make sure they exit. We can also use this as a chance to build the
        // collection if it does not exist.
        var collections: Table<mongodb.Collection> = [];
        var names: Map<boolean> = {};

        async.each(registry.getEntityMappings(), (mapping: EntityMapping, callback: (err?: Error) => void) => {

            if(!(mapping.flags & MappingFlags.InheritanceRoot)) return done();

            // make sure we have a collection name
            if (!mapping.collectionName) {
                return done(new Error("Missing collection name on mapping for type '" + mapping.name + "'."));
            }

            // make sure db/collection is not mapped to some other type.
            var key = [(mapping.databaseName || connection.databaseName), "/", mapping.collectionName].join("");
            if (Map.hasProperty(names, key)) {
                return done(new Error("Duplicate collection name '" + key + "' on type '" + mapping.name + "' ."));
            }
            names[key] = true;

            // change current database if a databaseName was specified in the mapping
            if(mapping.databaseName && mapping.databaseName !== connection.databaseName) {
                connection = connection.db(mapping.databaseName);
            }

            connection.listCollections({ name: mapping.collectionName }).toArray((err: Error, names: string[]): void => {
                if(err) return done(err);

                if(names.length == 0) {
                    // collection does not exist, create it
                    connection.createCollection(mapping.collectionName, mapping.collectionOptions || {}, (err, collection) => {
                        if(err) return done(err);
                        collections[mapping.id] = collection;
                        // TODO: create indexes for newly created collection
                        done();
                    });
                }
                else {
                    // collection exists, get it
                    connection.collection(mapping.collectionName, { strict: true }, (err: Error, collection: mongodb.Collection) => {
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

export = Configuration;
