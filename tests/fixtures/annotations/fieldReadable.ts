import { Entity, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field()
    a: string;

    @Field({ readable: false })
    b: string;

    @Field({ readable: true })
    c: string;
}
