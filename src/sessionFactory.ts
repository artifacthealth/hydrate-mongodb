import {Collection} from "mongodb";
import {Table} from "./core/table";
import {MappingRegistry} from "./mapping/mappingRegistry";
import {Session, InternalSession, SessionImpl} from "./session";
import {Constructor} from "./index";
import {Persister} from "./persister";
import {PersisterImpl} from "./persister";
import {MappingModel} from "./mapping/mappingModel";
import {EntityMapping} from "./mapping/entityMapping";
import {Logger} from "./config/configuration";

export interface SessionFactory {

    createSession(): Session;
}


/**
 * @hidden
 */
export interface InternalSessionFactory extends SessionFactory {

    logger: Logger;
    getMappingForObject(obj: any): EntityMapping;
    getMappingForConstructor(ctr: Constructor<any>): EntityMapping;
    createPersister(session: InternalSession, mapping: EntityMapping): Persister;
}

/**
 * @hidden
 */
export class SessionFactoryImpl implements InternalSessionFactory {

    logger: Logger;

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
        if(mapping && (mapping.flags & MappingModel.MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    getMappingForConstructor(ctr: Constructor<any>): EntityMapping {

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if(mapping && (mapping.flags & MappingModel.MappingFlags.Entity)) {
            return <EntityMapping>mapping;
        }
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {

        return new PersisterImpl(session, mapping, this._collections[mapping.inheritanceRoot.id]);
    }
}
