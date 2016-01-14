/// <reference path="../../typings/mongodb.d.ts" />

import * as mongodb from "mongodb";

export class MockBulk implements mongodb.UnorderedBulkOperation {

    findDocuments: any[] = [];
    replaceOneDocuments: any[] = [];
    removeOneCalled = 0;

    update(updateDocument: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    updateOne(updateDocument: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    replaceOne(updateDocument: any): mongodb.UnorderedBulkOperation {
        this.replaceOneDocuments.push(updateDocument);
        return this;
    }
    upsert(): mongodb.UnorderedBulkOperation {
        return this;
    }
    removeOne(): mongodb.UnorderedBulkOperation {
        this.removeOneCalled++;
        return this;
    }
    remove(): mongodb.UnorderedBulkOperation {
        return this;
    }
    insert(document: any): mongodb.UnorderedBulkOperation {
        return this;
    }
    find(selector: any): mongodb.UnorderedBulkOperation {
        this.findDocuments.push(selector);
        return this;
    }

    execute(optionsOrCallback: any, callback?: (err: Error, result: any) => void): void {

    }
}
