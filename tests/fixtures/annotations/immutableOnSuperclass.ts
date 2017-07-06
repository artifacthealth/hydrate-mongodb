import {Entity, Field, Immutable} from "../../../src/mapping/providers/decorators";

@Immutable()
export class A {

    @Field()
    a: string;
}

@Entity()
export class B extends A {

    @Field()
    b: string;
}