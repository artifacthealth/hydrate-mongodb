import Collection = require("./collection");
import CollectionOptions = require("./collectionOptions");
import IndexOptions = require("./indexOptions");
import Cursor = require("./cursor");

interface Db {

    databaseName?: string;

    db(dbName: string): Db;
    close(forceClose?: boolean, callback?: (err: Error, result: any) => void ): void;
    collection(collectionName: string, options: CollectionOptions, callback: (err: Error, collection: Collection) => void ): Collection;
    createCollection(collectionName: string, options: CollectionOptions, callback?: (err: Error, result: any) => void ): void;
    ensureIndex(collectionName: any, fieldOrSpec: any, options: IndexOptions, callback: Function): void;
    listCollections(filter: Object): Cursor;
}

export = Db;