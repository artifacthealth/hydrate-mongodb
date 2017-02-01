import {Entity, Type, Parent} from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Type("C")
    c: C;
}

@Entity()
export class C {

    @Parent()
    a: A;
}
