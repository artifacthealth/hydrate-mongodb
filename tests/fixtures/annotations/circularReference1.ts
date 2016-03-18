import { Entity, Collection, Field, Type } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/mappingModel"
import { B } from "./circularReference2";

@Entity()
export class A {

    @Type("B")
    b: B;
}

export { B }
