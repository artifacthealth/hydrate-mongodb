import { Entity, Converter, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export class B {

    @Converter("Blah")
    a: string;
}

