import InternalSessionFactory = require("../src/internalSessionFactory");
import Constructor = require("../src/core/constructor");
import Persister = require("../src/persister");
import EntityMapping = require("../src/mapping/entityMapping");
import Batch = require("../src/batch");
import Session = require("../src/session");
import MockPersister = require("./mockPersister");

class MockSessionFactory implements InternalSessionFactory {

    persister = new MockPersister();

    getPersisterForObject(obj: any): Persister {
        return this.persister;
    }

    getPersisterForConstructor(ctr: Constructor<any>): Persister {
        return this.persister;
    }

    getPersisterForMapping(mapping: EntityMapping): Persister {
        return this.persister;
    }

    createSession(): Session {
        throw new Error("Not implemented");
    }
}

export = MockSessionFactory