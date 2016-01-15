import { Entity, ElementType } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

}

@Entity()
export class B {

    @ElementType(String)
    a: B[];
}
