import { Entity, Field, ReferenceMany, EmbedMany, ChangeTracking, Embeddable } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field()
    field1: string;

    @ReferenceMany(B)
    field2: B[] = [];
}

@Entity()
export class B {

    name: string;
}

