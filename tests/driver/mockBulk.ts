import {UnorderedBulkOperation, BulkWriteResult, FindOperatorsUnordered} from "mongodb";

export class MockBulk implements UnorderedBulkOperation, FindOperatorsUnordered {

    length: number;
    findDocuments: any[] = [];
    replaceOneDocuments: any[] = [];
    removeOneCalled = 0;

    update(updateDocument: any): UnorderedBulkOperation {
        return this;
    }

    updateOne(updateDocument: any): UnorderedBulkOperation {
        return this;
    }

    replaceOne(updateDocument: any): UnorderedBulkOperation {
        this.replaceOneDocuments.push(updateDocument);
        return this;
    }

    upsert(): FindOperatorsUnordered {
        return this;
    }

    removeOne(): UnorderedBulkOperation {
        this.removeOneCalled++;
        return this;
    }

    remove(): UnorderedBulkOperation {
        return this;
    }

    insert(document: any): UnorderedBulkOperation {
        return this;
    }

    find(selector: any): FindOperatorsUnordered {
        this.findDocuments.push(selector);
        return this;
    }

    execute(optionsOrCallback: any, callback?: (err: Error, result: any) => void): Promise<BulkWriteResult> {

        throw new Error("Not implemented");
    }
}
