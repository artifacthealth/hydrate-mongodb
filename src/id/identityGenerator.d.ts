import Identifier = require("./identifier");

interface IdentityGenerator {

    generate(): Identifier;
    validate(id: Identifier): boolean;
}

export = IdentityGenerator;