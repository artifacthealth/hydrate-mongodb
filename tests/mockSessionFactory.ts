import {SessionFactoryImpl} from "../src/sessionFactory";
import {InternalSession} from "../src/session";
import {Persister} from "../src/persister";
import {EntityMapping} from "../src/mapping/entityMapping";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {MockPersister} from "./mockPersister";
import {Constructor} from "../src/index";
import {MockDb} from "./driver/mockDb";

export class MockSessionFactory extends SessionFactoryImpl {

    constructor(public mappingRegistry: MappingRegistry) {
        super(new MockDb(), null, mappingRegistry);
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {

        return new MockPersister(session, mapping);
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
