import Cursor = require("./cursor");

interface Collection {

    find(selector: Object, callback?: (err: Error, result: Cursor) => void): Cursor;
    findOne(selector: Object, callback?: (err: Error, result: any) => void): Cursor;
}

export = Collection;