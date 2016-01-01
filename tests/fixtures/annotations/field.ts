import { Entity, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field({ name: "a" })
    b: string;

    @Field()
    c: string;

    @Field({ name: "someName" })
    d: string;
}

