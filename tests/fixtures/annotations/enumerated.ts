import { Entity, Field, Enumerated } from "../../../src/mapping/providers/decorators";

/** Enum stored as string
 */
export enum E1 {
    value0,
    value1,
    value2
}

/** Enum stored as ordinal
 */
export enum E2 {
    value0,
    value1,
    value2
}

@Entity()
export class A {

    @Enumerated(E1)
    e1: E1;

    @Field()
    e2: E2;
}

