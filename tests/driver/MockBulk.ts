/// <reference path="../../typings/mongodb.d.ts" />

import * as mongodb from "mongodb";

export class MockBulk implements mongodb.UnorderedBulkOperation {

    update(updateDocument: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    updateOne(updateDocument: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    replaceOne(updateDocument: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    upsert(): mongodb.UnorderedBulkOperation {
        return this;
    }
    removeOne(): mongodb.UnorderedBulkOperation {
        return this;
    }
    remove(): mongodb.UnorderedBulkOperation {
        return this;
    }
    insert(document: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    find(selector: any): mongodb.UnorderedBulkOperation {
        return this;
    }

    execute(optionsOrCallback: any, callback?: (err: Error, result: any) => void): void {

    }
}
