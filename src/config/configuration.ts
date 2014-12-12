/// <reference path="../../typings/async.d.ts" />

import async = require("async");

import Callback = require("../callback");
import ResultCallback = require("../resultCallback");

import Map = require("../map");
import SessionFactory = require("../sessionFactory");
import DatabaseDriver = require("../driver/databaseDriver");
import MongoDriver = require("../driver/mongoDriver");
import Connection = require("../driver/connection");
import Collection = require("../driver/collection");
import TypeMapping = require("../mapping/typeMapping");
import MappingRegistry = require("../mapping/mappingRegistry");
import MappingProvider = require("../mapping/providers/mappingProvider");
import AnnotationMappingProvider = require("../mapping/providers/annotationMappingProvider");
import ConfigurationOptions = require("./configurationOptions");

class Configuration {

    private _mappingProvider: AnnotationMappingProvider;
    private _options: ConfigurationOptions;
    private _optionsProcessed: boolean;
    private _driver: DatabaseDriver;

    constructor(options?: ConfigurationOptions) {

        this._options = options;
        this._driver = new MongoDriver();
        this._mappingProvider = new AnnotationMappingProvider(this);
    }

    addDeclarationFile(path: string): void {

        this._mappingProvider.addFile(path);
    }

    createSessionFactory(callback: ResultCallback<SessionFactory>): void;
    createSessionFactory(connection: Connection, callback: ResultCallback<SessionFactory>): void;
    createSessionFactory(connectionOrCallback: any, callback?: ResultCallback<SessionFactory>): void {

        if(typeof connectionOrCallback === "function") {
            callback = connectionOrCallback;

            if(!this._options.uri) {
                var error = new Error("A database connection must be passed to createSessionFactory or a connection URI should be specified in the configuration options.");
            }
            if(typeof this._options.uri !== "string") {
                var error = new Error("Connection URI expected to be of type string.");
            }
            if(error) return callback(error, null);

            this._driver.connect(this._options.uri, this._options.connectionOptions || {}, (err, connection) => {
                if(err) return callback(err);
                this._createFactory(connection, callback);
            });
        }
        else {
            this._createFactory(connectionOrCallback, callback);
        }
    }

    private _createFactory(connection: Connection, callback: ResultCallback<SessionFactory>): void {

        // wait to until now to process options so any errors can be passed to callback instead of raised in constructor
        if(!this._optionsProcessed) {
            this._optionsProcessed = true;

            var files = this._options && this._options.declarationFiles;
            if(files) {
                if(!Array.isArray(files)) {
                    return callback(new Error("Expected declarationFiles to be of type array."));
                }

                for (var i = 0, l = files.length; i < l; i++) {
                    this.addDeclarationFile(files[i]);
                }
            }
        }

        this._mappingProvider.getMapping((err, mappings) => {
            if(err) return callback(err);

            var sessionFactory = new SessionFactory(connection, new MappingRegistry(mappings));
            callback(null, sessionFactory);
        });
    }

    private _buildCollections(connection: Connection, mappings: TypeMapping[], callback: ResultCallback<Collection[]>): void {

        // Get all the collections and make sure they exit. We can also use this as a chance to build the
        // collection if it does not exist.
        var collections: Collection[] = [];
        var names: Map<boolean> = {};

        async.each(mappings, (item: TypeMapping, callback) => {

            //TODO: check to make sure we have a collection name
            if(Map.hasProperty(names, item.collectionName)) {
                // TOD: duplicate collection error
            }

            connection.db.collection()


        }, (err) => {
            if(err) return callback(err);
            callback(null, collections);
        });
    }
}

export = Configuration;