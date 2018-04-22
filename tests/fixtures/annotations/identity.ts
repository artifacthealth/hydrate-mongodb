import { Entity, Identity } from "../../../src/mapping/providers/decorators";
import {IdentityGenerator} from "../../../src/config/configuration";

/**
 * Identity Generator for test purposes only. Don't actually use this implementation!
 */
export class TestGenerator implements IdentityGenerator {

    next: number;

    constructor(next: number = 1) {
        this.next = next;
    }

    generate(): any {
        return this.next++;
    }

    fromString(text: string): any {
        return parseInt(text, 10);
    }

    validate(value: any): boolean {
        return typeof value === "number";
    }

    areEqual(first: any, second: any): boolean {
        return first === second;
    }
}

@Entity()
@Identity(TestGenerator)
export class A {

}

@Entity()
@Identity(new TestGenerator(42))
export class B {

}
