import {IdentityGenerator} from "../../src/config/configuration";

export class MockIdentityGenerator implements IdentityGenerator {

    nextId = 1;

    generateCalled = 0;

    generate(): any {
        this.generateCalled++;
        return this.nextId++;
    }

    fromString(text: string): any {
        return parseInt(text);
    }

    validate(value: any): boolean {
        return typeof value === "number";
    }

    areEqual(first: any, second: any): boolean {
        return first === second;
    }
}
