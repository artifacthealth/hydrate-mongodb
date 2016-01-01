import { Entity } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

}

@Entity()
export class B extends A {

}
