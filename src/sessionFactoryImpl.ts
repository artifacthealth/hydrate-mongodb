/// <reference path="../typings/mongodb.d.ts" />
import {Collection} from "mongodb";

import {Table} from "./core/table";
import {MappingRegistry} from "./mapping/mappingRegistry";
import {Session} from "./session";
import {SessionImpl} from "./sessionImpl";
import {InternalSessionFactory} from "./internalSessionFactory";
import {InternalSession} from "./internalSession";
import {Constructor} from "./core/constructor";
import {Persister} from "./persister";
import {PersisterImpl} from "./persisterImpl";
import {MappingFlags} from "./mapping/mappingFlags";
import {EntityMapping} from "./mapping/entityMapping";

export class SessionFactoryImpl implements InternalSessionFactory {

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
