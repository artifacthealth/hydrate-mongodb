import Bulk = require("../../src/driver/bulk");
import Cursor = require("../../src/driver/cursor");
import Collection = require("../../src/driver/collection");
import MockCursor = require("./mockCursor");
import MockBulk = require("./mockBulk");

class MockCollection implements Collection {

    constructor(public contents: any[]) {

    }

    find(selector: Object, callback?: (err: Error, result: Cursor) => void): Cursor {

        return new MockCursor(this.contents);
    }

    findOne(selector: Object, callback?: (err: Error, result: any) => void): any {

        process.nextTick(() => {
           callback(null, this.contents[0]);
        });
    }

    initializeUnorderedBulkOp(): Bulk {

        return new MockBulk();
    }
}

export = MockCollection;
