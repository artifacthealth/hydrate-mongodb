import Constructor = require("./core/constructor");
import SessionFactory = require("./sessionFactory");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");
import ClassMapping = require("./mapping/classMapping");
import Batch = require("./batch");

interface InternalSessionFactory extends SessionFactory {

    getPersisterForObject(obj: any): Persister;
    getPersisterForConstructor(ctr: Constructor<any>): Persister;
    getPersisterForMapping(mapping: EntityMapping): Persister;
    createBatch(): Batch;
}
export = InternalSessionFactory;