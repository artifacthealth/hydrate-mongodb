import { Entity, Collection, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

}

@Entity()
@Collection("someCollection")
export class B {

}

@Entity()
@Collection({ db: "someDatabase" })
export class C {

}

@Entity()
@Collection({ name: "someCollection", db: "someDatabase" })
export class D {

}