import CollectionTable = require("./driver/collectionTable");
import Connection = require("./driver/connection");
import MappingRegistry = require("./mapping/mappingRegistry");
import Session = require("./session");
import SessionImpl = require("./sessionImpl");
import InternalSessionFactory = require("./internalSessionFactory");
import Constructor = require("./core/constructor");
import EntityPersister = require("./entityPersister");
import Mapping = require("./mapping/mapping");
import MappingFlags = require("./mapping/mappingFlags");
import ClassMapping = require("./mapping/classMapping");
import EntityMapping = require("./mapping/entityMapping");
import Batch = require("./batch");


class SessionFactoryImpl implements InternalSessionFactory {

    private _collections: CollectionTable;
    private _mappingRegistry: MappingRegistry;
    private _persisterByMapping: EntityPersister[] = [];

    constructor(collections: CollectionTable, mappingRegistry: MappingRegistry) {

        this._collections = collections;
        // TODO: get rid of mapping registry and handle directly in session factory
        this._mappingRegistry = mappingRegistry;
    }

    createSession(): Session {

        return new SessionImpl(this);
    }

    getPersisterForObject(obj: any): EntityPersister {

        var mapping = this._mappingRegistry.getMappingForObject(obj);
        if(mapping && (mapping.flags & MappingFlags.Entity)) {
            return this.getPersisterForMapping(<EntityMapping>mapping);
        }
    }

    getPersisterForConstructor(ctr: Constructor<any>): EntityPersister {

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if(mapping && (mapping.flags & MappingFlags.Entity)) {
            return this.getPersisterForMapping(<EntityMapping>mapping);
        }
    }

    getPersisterForMapping(mapping: EntityMapping): EntityPersister {

        var persister = this._persisterByMapping[mapping.id];
        if(persister === undefined) {
            persister = new EntityPersister(this, mapping, this._collections[mapping.inheritanceRoot.id]);
        }
        return persister;
    }

    createBatch(): Batch {
        return new Batch();
    }
}

export = SessionFactoryImpl;