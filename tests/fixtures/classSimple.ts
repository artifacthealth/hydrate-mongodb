import { Entity, Field } from "../../src/mapping/providers/decorators";

@Entity()
export class ClassSimple {

    @Field()
    a: string;

    @Field()
    b: number;

    @Field()
    c: boolean;

    d: Date;

    @Field()
    e: RegExp;
}

@Entity()
export class ClassSimple2 extends ClassSimple {

}