import { Entity, Cascade, Field } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/cascadeFlags";

@Entity()
export class B {

}

@Entity()
export class A {

    @Field()
    a: string;

    @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
    b: B;
}