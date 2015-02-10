interface IdentityGenerator {

    generate(): any;
    fromString(text: string): any;
    validate(value: any): boolean;
    areEqual(first: any, second: any): boolean;

    // TODO: serialize and deserialize methods on IdentityGenerator? e.g. Perhaps UUID is a class when assigned to an
    // entity but is serialized to a string when stored in the database.
}

export = IdentityGenerator;