import Identifier = require("./identifier");

interface IdentityGenerator {

    generate(): Identifier;
    fromString(text: string): Identifier;
    validate(value: any): boolean;
    areEqual(a: Identifier, b: Identifier): boolean;

    // TODO: serialize and deserialize methods on IdentityGenerator? e.g. Perhaps UUID is a class when assigned to an
    // entity but is serialized to a string when stored in the database.
}

export = IdentityGenerator;