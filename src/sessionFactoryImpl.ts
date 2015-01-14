import Table = require("./core/table");
import Collection = require("./driver/collection");
import Connection = require("./driver/connection");
import MappingRegistry = require("./mapping/mappingRegistry");
import Session = require("./session");
import SessionImpl = require("./sessionImpl");
import InternalSessionFactory = require("./internalSessionFactory");
import Constructor = require("./core/constructor");
import Persister = require("./persister");
import PersisterImpl = require("./persisterImpl");
import Mapping = require("./mapping/mapping");
import MappingFlags = require("./mapping/mappingFlags");
import ClassMapping = require("./mapping/classMapping");
import EntityMapping = require("./mapping/entityMapping");
import BatchImpl = require("./batchImpl");
import Batch = require("./batch");


class SessionFactoryImpl implements InternalSessionFactory {

    private _collections: Table<Collection>;
    private _mappingRegistry: MappingRegistry;
    private _persisterByMapping: Table<Persister> = [];

    constructor(collections: Table<Collection>, mappingRegistry: MappingRegistry) {

        this._collections = collections;
        // TODO: get rid of mapping registry and handle directly in session factory
        this._mappingRegistry = mappingRegistry;
    }

    createSession(): Session {

        return new SessionImpl(this);
    }

    getPersisterForObject(obj: any): Persister {

        var mapping = this._mappingRegistry.getMappingForObject(obj);
        if(mapping && (mapping.flags & MappingFlags.Entity)) {
            return this.getPersisterForMapping(<EntityMapping>mapping);
        }
    }

    getPersisterForConstructor(ctr: Constructor<any>): Persister {

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if(mapping && (mapping.flags & MappingFlags.Entity)) {
            return this.getPersisterForMapping(<EntityMapping>mapping);
        }
    }

    getPersisterForMapping(mapping: EntityMapping): Persister {

        var persister = this._persisterByMapping[mapping.id];
        if(persister === undefined) {
            persister = new PersisterImpl(this, mapping, this._collections[mapping.inheritanceRoot.id]);
        }
        return persister;
    }

    createBatch(): Batch {
        return new BatchImpl();
    }
}

export = SessionFactoryImpl;