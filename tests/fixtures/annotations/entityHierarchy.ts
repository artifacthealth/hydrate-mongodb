export module a {

    /**
     * @entity
     */
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