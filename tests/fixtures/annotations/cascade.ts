import { Entity, Reference, Field } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/cascadeFlags";

@Entity()
export class B {

}

@Entity()
export class A {

    @Field()
    a: string;

    @Reference({ cascade: CascadeFlags.Save | CascadeFlags.Remove })
    b: B;
}