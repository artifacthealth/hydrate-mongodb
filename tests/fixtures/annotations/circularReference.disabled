import { Entity, Collection, Field, ReferenceOne } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/cascadeFlags"

@Entity()
export class A {

    @ReferenceOne("B")
    b: B;
}

@Entity()
export class B {

    @ReferenceOne("A")
    a: A;
}