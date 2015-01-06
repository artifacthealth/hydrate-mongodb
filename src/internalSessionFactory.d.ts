import Constructor = require("./core/constructor");
import SessionFactory = require("./sessionFactory");
import EntityPersister = require("./entityPersister");
import EntityMapping = require("./mapping/entityMapping");
import ClassMapping = require("./mapping/classMapping");

interface InternalSessionFactory extends SessionFactory {

    getMappingForObject(obj: any): ClassMapping;
    getMappingForConstructor(ctr: Constructor<any>): ClassMapping;
    getPersisterForObject(obj: any): EntityPersister;
    getPersisterForConstructor(ctr: Constructor<any>): EntityPersister;
    getPersisterForMapping(mapping: EntityMapping): EntityPersister;
}
export = InternalSessionFactory;