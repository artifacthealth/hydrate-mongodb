import { Entity, Collection, Field, ReferenceOne } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/cascadeFlags"
import { A } from "./circularReference1";

@Entity()
export class B {

    @ReferenceOne("A")
    a: A;
}