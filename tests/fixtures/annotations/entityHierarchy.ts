import { Entity } from "../../../src/mapping/providers/decorators";

export namespace a {

    @Entity()
    export class A {

    }

    export module b {

        @Entity()
        export class B extends A {

        }

        @Entity()
        export class C extends B {

        }

        export class D {

        }
    }
}