import Cursor = require("./cursor");
import Bulk = require("./bulk");

interface Collection {

    collectionName?: string;
    find(selector: Object, callback?: (err: Error, result: Cursor) => void): Cursor;
    findOne(selector: Object, callback?: (err: Error, result: any) => void): Cursor;
    findAndModify(query: Object, sort: any[], doc: Object, options: { safe?: any; remove?: boolean; upsert?: boolean; new?: boolean; }, callback: (err: Error, result: any) => void): void;
    remove(selector: Object, options: { safe?: any; single?: boolean; }, callback?: (err: Error, result: any) => void): void;
    update(selector: Object, document: any, options: { safe?: boolean; upsert?: any; multi?: boolean; serializeFunctions?: boolean; }, callback: (err: Error, result: any) => void): void;
    count(query: Object, options: { readPreference?: string; limit?: number; skip?: number}, callback: (err: Error, result: any) => void): void;
    distinct(key: string, query: Object, options: { readPreference: string; }, callback: (err: Error, result: any) => void): void;
    initializeUnorderedBulkOp?(): Bulk;
}

export = Collection;