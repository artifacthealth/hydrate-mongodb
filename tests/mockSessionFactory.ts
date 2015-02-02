import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import InternalSession = require("../src/internalSession");
import Persister = require("../src/persister");
import EntityMapping = require("../src/mapping/entityMapping");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import MockPersister = require("./mockPersister");

class MockSessionFactory extends SessionFactoryImpl {

    constructor(mappingRegistry: MappingRegistry) {
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
}

export = MockSessionFactory