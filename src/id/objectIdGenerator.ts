/// <reference path="../../typings/mongodb.d.ts" />

import mongodb = require("mongodb");
import ObjectID = mongodb.ObjectID;
import IdentityGenerator = require("./identityGenerator");

class ObjectIdGenerator implements IdentityGenerator {

    constructor() {
        // Turn on caching of the hex string representation of the ObjectID
        (<any>mongodb.ObjectID).cacheHexString = true;
    }

    generate(): any {
        return new ObjectID();
    }

    validate(value: any): boolean {
        return value instanceof ObjectID;
    }

    fromString(text: string): any {
        return ObjectID.createFromHexString(text);
    }

    areEqual(first: any, second: any): boolean {
        return first.equals(second);
    }
}

export = ObjectIdGenerator;