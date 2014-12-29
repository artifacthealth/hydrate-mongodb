/// <reference path="../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import Constructor = require("./core/constructor");
import SessionFactory = require("./sessionFactory");
import TypeMapping = require("./mapping/typeMapping");
import EntityPersister = require("./persister/entityPersister");

interface InternalSessionFactory extends SessionFactory {

    getMappingForType(type: reflect.Type): TypeMapping;
    getMappingForObject(obj: any): TypeMapping;
    getMappingForConstructor(ctr: Constructor<any>): TypeMapping;
    getPersisterForObject(obj: any): EntityPersister;
    getPersisterForConstructor(ctr: Constructor<any>): EntityPersister;
    getPersisterForMapping(mapping: TypeMapping): EntityPersister;
}
export = InternalSessionFactory;