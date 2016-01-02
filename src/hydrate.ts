import {Reference} from "./reference";

export {NamingStrategies} from "./config/namingStrategies";
export {Configuration} from "./config/configuration";
export {ObjectIdGenerator} from "./id/objectIdGenerator";
export {AnnotationMappingProvider} from "./mapping/providers/annotationMappingProvider";
export * from "./mapping/providers/decorators";

/**
 * Returns true if values are equivalent. Values can be entities or references to entities.
 * @param value1 The first reference or entity to compare.
 * @param value2 The second reference or entity to compare.
 */
export function areEqual(value1: any, value2: any): boolean {

    return Reference.areEqual(value1, value2);
}
