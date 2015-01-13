import Identifier = require("../../src/id/identifier");
import IdentityGenerator = require("../../src/id/identityGenerator");

class MockIdentityGenerator implements IdentityGenerator {

    nextId = 1;

    generateCalled = 0;

    generate(): Identifier {
        this.generateCalled++;
        return this.nextId++;
    }

    fromString(text: string): Identifier {
        return parseInt(text);
    }

    validate(value: any): boolean {
        return typeof value === "number";
    }

    areEqual(a: Identifier, b: Identifier): boolean {
        return a === b;
    }
}

export = MockIdentityGenerator;