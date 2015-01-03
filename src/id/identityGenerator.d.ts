import Identifier = require("./identifier");

interface IdentityGenerator {

    generate(): Identifier;
    fromString(text: string): Identifier;
    validate(value: any): boolean;
    areEqual(a: Identifier, b: Identifier): boolean;
}

export = IdentityGenerator;