import * as NamingStrategies from "./config/namingStrategies";
import {Configuration} from "./config/configuration";
import {ObjectIdGenerator} from "./id/objectIdGenerator";
import {AnnotationMappingProvider} from "./mapping/providers/annotationMappingProvider";

import {Reference} from "./reference";

/**
 * Returns true if values are equivalent. Values can be entities or references to entities.
 * @param value1 The first reference or entity to compare.
 * @param value2 The second reference or entity to compare.
 */
function areEqual(value1: any, value2: any): boolean {

    return Reference.areEqual(value1, value2);
}

export {
    areEqual,
    Configuration,
    ObjectIdGenerator,
    NamingStrategies,
    AnnotationMappingProvider
}
