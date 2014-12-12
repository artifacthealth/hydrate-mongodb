import Cursor = require("./cursor");

interface Collection {

    find(selector: Object, callback?: (err: Error, result: Cursor) => void): Cursor;
}

export = Collection;