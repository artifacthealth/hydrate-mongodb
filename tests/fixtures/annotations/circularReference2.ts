import { Entity, Collection, Field, Type } from "../../../src/mapping/providers/decorators";
import { CascadeFlags } from "../../../src/mapping/mappingModel"
import { A } from "./circularReference1";

@Entity()
export class B {

    @Type("A")
    a: A;
}