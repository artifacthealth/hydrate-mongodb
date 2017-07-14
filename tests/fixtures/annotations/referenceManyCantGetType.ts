import { Entity, Field, ElementType, ChangeTracking, Embeddable } from "../../../src/mapping/providers/decorators";

@Entity()
export class B {

    name: string;
}

@Entity()
export class A {

    @Field()
    field1: string;

    @ElementType(B)
    field2: B[] = [];
}

