import { Entity, EmbedMany } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

}

@Entity()
export class B {

    @EmbedMany(B)
    a: B[];
}
