import Identifier = require("./identifier");

interface IdentityGenerator {

    generate(): Identifier;
    fromString(text: string): Identifier;
}

export = IdentityGenerator;