/// <reference path="../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import CollectionTable = require("./driver/collectionTable");
import Connection = require("./driver/connection");
import MappingRegistry = require("./mapping/mappingRegistry");
import Session = require("./session");
import SessionImpl = require("./sessionImpl");
import InternalSessionFactory = require("./internalSessionFactory");
import Constructor = require("./core/constructor");
import EntityPersister = require("./persister/entityPersister");
import TypeMapping = require("./mapping/typeMapping");


class SessionFactoryImpl implements InternalSessionFactory {

    private _collections: CollectionTable;
    private _mappingRegistry: MappingRegistry;
    private _persisterByMapping: EntityPersister[] = [];

    constructor(collections: CollectionTable, mappingRegistry: MappingRegistry) {

        this._collections = collections;
        this._mappingRegistry = mappingRegistry;
    }

    createSession(): Session {

        return new SessionImpl(this);
    }

    getMappingForType(type: reflect.Type): TypeMapping {

        return this._mappingRegistry.getMappingForType(type);
    }

    getMappingForObject(obj: any): TypeMapping {

        return this._mappingRegistry.getMappingForObject(obj);
    }

    getMappingForConstructor(ctr: Constructor<any>): TypeMapping {

        return this._mappingRegistry.getMappingForConstructor(ctr);
    }

    getPersisterForObject(obj: any): EntityPersister {

        return this.getPersisterForMapping(this._mappingRegistry.getMappingForObject(obj));
    }

    getPersisterForConstructor(ctr: Constructor<any>): EntityPersister {

        return this.getPersisterForMapping(this._mappingRegistry.getMappingForConstructor(ctr));
    }

    getPersisterForMapping(mapping: TypeMapping): EntityPersister {

        var persister = this._persisterByMapping[mapping.id];
        if(persister === undefined) {
            persister = new EntityPersister(this, mapping, this._collections[mapping.root.id]);
        }
        return persister;
    }
}

export = SessionFactoryImpl;