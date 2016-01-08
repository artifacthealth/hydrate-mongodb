import { Embeddable, Field, Id } from "../../../src/mapping/providers/decorators";

@Embeddable()
export class A {

    @Id()
    id: string;

    @Field()
    a: number;
}

