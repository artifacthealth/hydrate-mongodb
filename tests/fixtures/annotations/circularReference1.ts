import { Entity, Collection, Field, ReferenceOne } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/cascadeFlags"
import { B } from "./circularReference2";

@Entity()
export class A {

    @ReferenceOne("B")
    b: B;
}

export { B }
