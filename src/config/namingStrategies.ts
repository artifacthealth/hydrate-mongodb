/// <reference path="../../typings/change-case.d.ts" />

import * as changeCase from "change-case";

/**
 * The name is passed through as-is.
 * @param name The name.
 */
export function None(name: string): string {

    return name;
}

/**
 * The name separators are denoted by having the next letter capitalized.
 * @param name The name.
 */
export function CamelCase(name: string): string {

    return changeCase.camelCase(name);
}

/**
 * The same as CamelCase except with the first letter also capitalized.
 * @param name The name.
 */
export function PascalCase(name: string): string {

    return changeCase.pascalCase(name);
}

/**
 * The name is a lowercase underscore separated string.
 * @param name The name.
 */
export function SnakeCase(name: string): string {

    return changeCase.snakeCase(name);
}
