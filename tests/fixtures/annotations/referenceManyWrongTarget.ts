import { Entity, ReferenceMany } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

}

@Entity()
export class B {

    @ReferenceMany(String)
    a: B[];
}
