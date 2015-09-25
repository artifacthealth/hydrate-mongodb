/** Enum stored as string
 * @enumerated "string"
 */
export enum E1 {
    value0,
    value1,
    value2
}

/** Enum stored as ordinal
 * @enumerated "ordinal"
 */
export enum E2 {
    value0,
    value1,
    value2
}

/** Enum stored using default method (ordinal) */
export enum E3 {
    value0,
    value1,
    value2
}

/**
 * @entity
 */
export class A {

    e1: E1;
    e2: E2;
    e3: E3;
}

