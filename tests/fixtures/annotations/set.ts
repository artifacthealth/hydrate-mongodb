import { Entity, Field, ReferenceMany, EmbedMany, ChangeTracking, Embeddable } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field()
    field1: string;

    @EmbedMany("B")
    field2: Set<B> = new Set();
}

@Embeddable()
export class B {

    name: string;
}

