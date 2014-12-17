import Bulk = require("../../src/driver/bulk");

class MockBulk implements Bulk {

    update(updateDocument: any): Bulk {
        return this;
    }
    updateOne(updateDocument: any): Bulk {
        return this;
    }
    replaceOne(updateDocument: any): Bulk {
        return this;
    }
    upsert(): Bulk {
        return this;
    }
    removeOne(): Bulk {
        return this;
    }
    remove(): Bulk {
        return this;
    }
    insert(document: any): Bulk {
        return this;
    }
    find(selector: any): Bulk {
        return this;
    }

    execute(optionsOrCallback: any, callback?: (err: Error, result: any) => void): void {

    }
}

export = MockBulk;