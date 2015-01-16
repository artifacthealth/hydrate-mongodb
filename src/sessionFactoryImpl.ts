import Table = require("./core/table");
import Collection = require("./driver/collection");
import Connection = require("./driver/connection");
import MappingRegistry = require("./mapping/mappingRegistry");
import Session = require("./session");
import SessionImpl = require("./sessionImpl");
import InternalSessionFactory = require("./internalSessionFactory");
import InternalSession = require("./internalSession");
import Constructor = require("./core/constructor");
import Persister = require("./persister");
import PersisterImpl = require("./persisterImpl");
import MappingFlags = require("./mapping/mappingFlags");
import EntityMapping = require("./mapping/entityMapping");


class SessionFactoryImpl implements InternalSessionFactory {

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
        if(mapping && (mapping.flags & MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    getMappingForConstructor(ctr: Constructor<any>): EntityMapping {

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if(mapping && (mapping.flags & MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {

        return new PersisterImpl(session, mapping, this._collections[mapping.inheritanceRoot.id]);
    }
}

export = SessionFactoryImpl;