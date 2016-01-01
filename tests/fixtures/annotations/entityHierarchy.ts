import { Entity } from "../../../src/mapping/providers/decorators";

export namespace a {

    @Entity()
    export class A {

    }

    export module b {

        export class B extends A {

        }

        export class C extends B {

        }

        export class D {

        }
    }
}