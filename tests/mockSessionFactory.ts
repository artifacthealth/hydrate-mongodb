import InternalSessionFactory = require("../src/internalSessionFactory");
import InternalSession = require("../src/internalSession");
import Constructor = require("../src/core/constructor");
import Persister = require("../src/persister");
import EntityMapping = require("../src/mapping/entityMapping");
import Session = require("../src/session");

class MockSessionFactory implements InternalSessionFactory {

    persister: Persister;
    mapping: EntityMapping;

    getMappingForObject(obj: any): EntityMapping {
        return this.mapping;
    }

    getMappingForConstructor(ctr: Constructor<any>): EntityMapping {
        return this.mapping;
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {
        return this.persister;
    }

    createSession(): Session {
        throw new Error("Not implemented");
    }
}

export = MockSessionFactory