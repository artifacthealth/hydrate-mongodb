import { Entity, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field()
    a: string;

    @Field({ name: "a" })
    b: string;
}

