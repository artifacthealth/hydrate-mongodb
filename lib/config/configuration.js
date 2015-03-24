var async = require("async");
var MappingRegistry = require("../mapping/mappingRegistry");
var ChangeTracking = require("../mapping/changeTracking");
var SessionFactoryImpl = require("../sessionFactoryImpl");
var Map = require("../core/map");
var NamingStrategies = require("./NamingStrategies");
var ObjectIdGenerator = require("../id/objectIdGenerator");
var Configuration = (function () {
    function Configuration() {
        /**
         * Default identity generator to use.
         */
        this.identityGenerator = new ObjectIdGenerator();
        /**
         * True if entities are versioned by default; otherwise, false.
         */
        this.versioned = true;
        /**
         * Default field name to use for optimistic locking.
         */
        this.versionField = "__v";
        /**
         * Default field name to use for the class discriminator.
         */
        this.discriminatorField = "__t";
        /**
         * Default change tracking strategy to use.
         */
        this.changeTracking = 2 /* Observe */;
        /**
         * Naming strategy to use for collection names.
         */
        this.collectionNamingStrategy = NamingStrategies.CamelCase;
        /**
         * Naming strategy to use for field names.
         */
        this.fieldNamingStrategy = NamingStrategies.CamelCase;
        /**
         * Naming strategy to use for the discriminator value of a class.
         */
        this.discriminatorNamingStrategy = NamingStrategies.None;
        this._mappings = [];
    }
    /**
     * Adds a mapping provider to the configuration.
     * @param mapping The mapping provider to use.
     */
    Configuration.prototype.addMapping = function (mapping) {
        this._mappings.push(mapping);
    };
    /**
     * Creates a session factory.
     * @param connection The MongoDB connection to use.
     * @param callback Called once the session factory is created.
     */
    Configuration.prototype.createSessionFactory = function (connection, callback) {
        var _this = this;
        var registry = new MappingRegistry();
        if (!this._mappings || this._mappings.length == 0) {
            return callback(new Error("No mappings were added to the configuration."));
        }
        // Get the mappings from the mapping providers
        async.each(this._mappings, function (provider, done) {
            provider.getMapping(_this, function (err, r) {
                if (err)
                    return done(err, null);
                // Merge all registries. Duplicates will cause an error.
                registry.addMappings(r);
                done(null, null);
            });
        }, function (err) {
            if (err)
                return callback(err);
            _this._buildCollections(connection, registry, function (err, collections) {
                if (err)
                    return callback(err);
                callback(null, new SessionFactoryImpl(collections, registry));
            });
        });
    };
    Configuration.prototype._buildCollections = function (connection, registry, callback) {
        // Get all the collections and make sure they exit. We can also use this as a chance to build the
        // collection if it does not exist.
        var collections = [];
        var names = {};
        async.each(registry.getEntityMappings(), function (mapping, callback) {
            if (!(mapping.flags & 4096 /* InheritanceRoot */))
                return done();
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
            if (mapping.databaseName && mapping.databaseName !== connection.databaseName) {
                connection = connection.db(mapping.databaseName);
            }
            connection.listCollections({ name: mapping.collectionName }).toArray(function (err, names) {
                if (err)
                    return done(err);
                if (names.length == 0) {
                    // collection does not exist, create it
                    connection.createCollection(mapping.collectionName, mapping.collectionOptions || {}, function (err, collection) {
                        if (err)
                            return done(err);
                        collections[mapping.id] = collection;
                        // TODO: create indexes for newly created collection
                        done();
                    });
                }
                else {
                    // collection exists, get it
                    connection.collection(mapping.collectionName, { strict: true }, function (err, collection) {
                        if (err)
                            return done(err);
                        collections[mapping.id] = collection;
                        done();
                    });
                }
            });
            function done(err) {
                process.nextTick(function () {
                    callback(err);
                });
            }
        }, function (err) {
            if (err)
                return callback(err);
            callback(null, collections);
        });
    };
    return Configuration;
})();
module.exports = Configuration;
