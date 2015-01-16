import Bulk = require("../../src/driver/bulk");
import Cursor = require("../../src/driver/cursor");
import Collection = require("../../src/driver/collection");
import MockCursor = require("./mockCursor");
import MockBulk = require("./mockBulk");

class MockCollection implements Collection {

    constructor() {

    }

    find(selector: Object, callback?: (err: Error, result: Cursor) => void): Cursor {

        return new MockCursor();
    }

    findOne(selector: Object, callback?: (err: Error, result: any) => void): any {

        process.nextTick(() => {
           callback(null, null);
        });
    }

    initializeUnorderedBulkOp(): Bulk {

        return new MockBulk();
    }
}

export = MockCollection;
