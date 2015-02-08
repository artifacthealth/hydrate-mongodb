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

    findAndModify(query: Object, sort: any[], doc: Object, options: { safe?: any; remove?: boolean; upsert?: boolean; new?: boolean; }, callback: (err: Error, result: any) => void): void {

    }

    remove(selector: Object, options: { safe?: any; single?: boolean; }, callback?: (err: Error, result: any) => void): void {

    }

    update(selector: Object, document: any, options: { safe?: boolean; upsert?: any; multi?: boolean; serializeFunctions?: boolean; }, callback: (err: Error, result: any) => void): void {

    }

    count(query: Object, options: { readPreference?: string; limit?: number; skip?: number}, callback: (err: Error, result: any) => void): void {

    }

    distinct(key: string, query: Object, options: { readPreference: string; }, callback: (err: Error, result: any) => void): void {

    }

    initializeUnorderedBulkOp(): Bulk {

        return new MockBulk();
    }
}

export = MockCollection;
