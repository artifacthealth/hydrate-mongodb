import Cursor = require("./cursor");
import Bulk = require("./bulk");

interface Collection {

    collectionName?: string;
    find(selector: Object, callback?: (err: Error, result: Cursor) => void): Cursor;
    findOne(selector: Object, callback?: (err: Error, result: any) => void): Cursor;
    initializeUnorderedBulkOp?(): Bulk;
}

export = Collection;