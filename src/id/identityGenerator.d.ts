import Identifier = require("./identifier");

interface IdentityGenerator {

    generate(): Identifier;
    fromString(text: string): Identifier;
    isIdentifier(value: any): boolean;
}

export = IdentityGenerator;