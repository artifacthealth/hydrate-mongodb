export import Configuration = require("./config/configuration");
export import NamingStrategies = require("./config/namingStrategies");
export import ObjectIdGenerator = require("./id/objectIdGenerator");
export import AnnotationMappingProvider = require("./mapping/providers/annotationMappingProvider");

import Reference = require("./reference");

/**
 * Returns true if values are equivalent. Values can be entities or references to entities.
 * @param value1 The first reference or entity to compare.
 * @param value2 The second reference or entity to compare.
 */
export function areEqual(value1: any, value2: any): boolean {

    return Reference.areEqual(value1, value2);
}