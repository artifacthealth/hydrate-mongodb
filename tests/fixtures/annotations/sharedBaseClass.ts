import { Entity, Field } from "../../../src/mapping/providers/decorators";

export class A {

    @Field()
    a: string;
}

@Entity()
export class B extends A {

    @Field()
    b: string;
}

@Entity()
export class C extends A {

    @Field()
    c: string;
}