import * as mongodb from "mongodb";
import {BulkWriteResult} from "mongodb";

export class MockBulk implements mongodb.UnorderedBulkOperation, mongodb.FindOperatorsUnordered {
    length: number;

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
    upsert(): mongodb.FindOperatorsUnordered {
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
    find(selector?: any): mongodb.FindOperatorsUnordered {
        this.findDocuments.push(selector);
        return this;
    }

    execute(optionsOrCallback: any, callback?: (err: Error, result: any) => void): Promise<BulkWriteResult> {
        return null;
    }
}
