import InternalSessionFactory = require("../src/internalSessionFactory");
import InternalSession = require("../src/internalSession");
import Constructor = require("../src/core/constructor");
import Persister = require("../src/persister");
import EntityMapping = require("../src/mapping/entityMapping");
import Batch = require("../src/batch");
import Session = require("../src/session");
import MockPersister = require("./mockPersister");
import MockIdentityGenerator = require("./id/mockIdentityGenerator");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import model = require("./fixtures/model");

class MockSessionFactory implements InternalSessionFactory {

    persister: MockPersister;
    mapping: EntityMapping;

    constructor() {
        var registry = new MappingRegistry();
        this.mapping = new EntityMapping(registry);
        this.mapping.identity = new MockIdentityGenerator();
        this.mapping.classConstructor = model.Address;
        registry.addMapping(this.mapping);
        this.persister = new MockPersister(this.mapping);
    }

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