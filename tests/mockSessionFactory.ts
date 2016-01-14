import {SessionFactoryImpl} from "../src/sessionFactoryImpl";
import {InternalSession} from "../src/internalSession";
import {Persister} from "../src/persister";
import {EntityMapping} from "../src/mapping/entityMapping";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {MockPersister} from "./mockPersister";
import {Constructor} from "../src/core/constructor";

export class MockSessionFactory extends SessionFactoryImpl {

    constructor(public mappingRegistry: MappingRegistry) {
        super(null, mappingRegistry);
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {

        return new MockPersister(mapping);
    }

    createSession(): InternalSession {

        return <InternalSession>super.createSession();
    }

    getPersisterForObject(session: InternalSession, obj: any): MockPersister {
        return <MockPersister>session.getPersister(this.getMappingForObject(obj));
    }

    getPersisterForConstructor(session: InternalSession, ctr: Constructor<any>): MockPersister {
        return <MockPersister>session.getPersister(this.getMappingForConstructor(ctr));
    }
}
