import Constructor = require("./core/constructor");
import SessionFactory = require("./sessionFactory");
import EntityPersister = require("./entityPersister");
import EntityMapping = require("./mapping/entityMapping");
import ClassMapping = require("./mapping/classMapping");
import Batch = require("./batch");

interface InternalSessionFactory extends SessionFactory {

    getPersisterForObject(obj: any): EntityPersister;
    getPersisterForConstructor(ctr: Constructor<any>): EntityPersister;
    getPersisterForMapping(mapping: EntityMapping): EntityPersister;

    createBatch(): Batch;
}
export = InternalSessionFactory;