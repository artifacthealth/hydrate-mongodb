import { Entity, Field } from "../../src/mapping/providers/decorators";

@Entity()
export default class ClassSimple {

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
class ClassSimple2 extends ClassSimple {

}