import {Reference} from "./reference";

export {NamingStrategies, NamingStrategy} from "./config/namingStrategies";
export {PersistenceError, EntityNotFoundError} from "./persistenceError";
export {CascadeFlags, ChangeTrackingType, FlushPriority, FetchType} from "./mapping/mappingModel";

export {Configuration} from "./config/configuration";
export {ObjectIdGenerator} from "./config/objectIdGenerator";
export {AnnotationMappingProvider} from "./mapping/providers/annotationMappingProvider";
export {CollationOptions} from "./mapping/collationOptions";

export * from "./mapping/providers/decorators";

export {Callback, ResultCallback, IteratorCallback} from "./core/callback";
export {IdentityGenerator, PropertyConverter} from "./config/configuration";
export {Session} from "./session";
export {SessionFactory} from "./sessionFactory";
export {
    Query,
    QueryBuilder,
    CountQuery,
    FindQuery,
    FindOneQuery,
    FindOneAndUpdateQuery,
    FindOneAndRemoveQuery,
    QueryDocument,
} from "./query/queryBuilder";

export interface Constructor<T> {

    name?: string;
    new(...args: any[]): T;
}

export interface ParameterlessConstructor<T> {

    name?: string;
    new(): T;
}

/**
 * Returns true if values are equivalent. Values can be entities or references to entities.
 * @param value1 The first reference or entity to compare.
 * @param value2 The second reference or entity to compare.
 */
export function areEqual(value1: Object, value2: Object): boolean {

    return Reference.areEqual(value1, value2);
}
