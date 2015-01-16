import Constructor = require("./core/constructor");
import SessionFactory = require("./sessionFactory");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");
import InternalSession = require("./internalSession");

interface InternalSessionFactory extends SessionFactory {

    getMappingForObject(obj: any): EntityMapping;
    getMappingForConstructor(ctr: Constructor<any>): EntityMapping;
    createPersister(session: InternalSession, mapping: EntityMapping): Persister;
}

export = InternalSessionFactory;