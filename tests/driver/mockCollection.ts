import {Collection, MongoCallback, AggregationCursor, BulkWriteOpResultObject, DeleteWriteOpResultObject, Cursor,
    FindAndModifyWriteOpResultObject, OrderedBulkOperation, UnorderedBulkOperation, InsertOneWriteOpResult,
    InsertWriteOpResult, CommandCursor, WriteOpResult, UpdateWriteOpResult, CollStats, FindOneOptions} from "mongodb";
import {MockCursor} from "./mockCursor";
import {MockBulk} from "./mockBulk";
import {CollectionOptions} from "../../src/mapping/collectionOptions";

export class MockCollection implements Collection {

    collectionName: string;
    namespace: string;
    writeConcern: any;
    readConcern: any;
    hint: any;
    bulk: MockBulk;

    constructor(public contents?: any[], name?: string) {

        this.collectionName = name;
    }

    aggregate(pipeline: Object[], optionsOrCallback?: any, callback?: MongoCallback<any>): AggregationCursor {
        return undefined;
    }

    bulkWrite(operations: Object[], optionsOrCallback?: any, callback?: MongoCallback<BulkWriteOpResultObject>): Promise<BulkWriteOpResultObject> {
        return undefined;
    }

    count(query: Object, optionsOrCallback?: any, callback?: MongoCallback<number>): Promise<number> {
        return undefined;
    }

    createIndex(fieldOrSpec: string|any, optionsOrCallback?: any, callback?: MongoCallback<string>): Promise<string> {
        return undefined;
    }

    createIndexes(indexSpecs: Object[], callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    deleteMany(filter: Object, options: CollectionOptions, callback?: MongoCallback<DeleteWriteOpResultObject>): Promise<DeleteWriteOpResultObject> {
        return undefined;
    }

    deleteOne(filter: Object, optionsOrCallback?: any, callback?: MongoCallback<DeleteWriteOpResultObject>): Promise<DeleteWriteOpResultObject> {
        return undefined;
    }

    distinct(key: string, query: Object, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {

        if (this.onDistinct) {
            process.nextTick(() => this.onDistinct(key, query, optionsOrCallback, callback));
            return;
        }
    }

    onDistinct: (key: string, query: Object, options: { readPreference: string; }, callback: (err: Error, result: any) => void) => void;


    drop(callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    dropIndex(indexName: string, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    dropIndexes(callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    find(query?: Object, fields?: Object, skip?: number, limit?: number, timeout?: number): Cursor {
        if (this.onFind) {
            return this.onFind(query, fields);
        }

        return this.createCursor();
    }

    onFind: (selector: Object, fields: Object) => Cursor;

    findOne(filter: Object, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        var options: FindOneOptions;

        if (typeof optionsOrCallback === "function") {
            callback = optionsOrCallback;
        }
        else {
            options = optionsOrCallback;
        }

        if (this.onFindOne) {
            process.nextTick(() => this.onFindOne(filter, options, callback));
            return;
        }

        process.nextTick(() => {
            callback(null, this.contents[0]);
        });
    }

    onFindOne: (filter: Object, options: FindOneOptions, callback?: (err: Error, result: any) => void) => any;

    findOneAndDelete(filter: Object, optionsOrCallback?: any, callback?: MongoCallback<FindAndModifyWriteOpResultObject>): Promise<FindAndModifyWriteOpResultObject> {
        return undefined;
    }

    findOneAndReplace(filter: Object, replacement: Object, optionsOrCallback?: any, callback?: MongoCallback<FindAndModifyWriteOpResultObject>): Promise<FindAndModifyWriteOpResultObject> {
        return undefined;
    }

    findOneAndUpdate(filter: Object, update: Object, optionsOrCallback?: any, callback?: MongoCallback<FindAndModifyWriteOpResultObject>): Promise<FindAndModifyWriteOpResultObject> {
        return undefined;
    }

    geoHaystackSearch(x: number, y: number, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    geoNear(x: number, y: number, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    group(keys: any, condition: Object, initial: Object, reduce: any, finalize: any, command: boolean, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    indexes(callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    indexExists(indexes: string|string[], callback?: MongoCallback<boolean>): Promise<boolean> {
        return undefined;
    }

    indexInformation(optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    initializeOrderedBulkOp(options?: CollectionOptions): OrderedBulkOperation {
        return undefined;
    }

    initializeUnorderedBulkOp(options?: CollectionOptions): UnorderedBulkOperation {

        return this.bulk = new MockBulk();
    }

    insert(docs: Object, optionsOrCallback?: any, callback?: MongoCallback<InsertOneWriteOpResult>): Promise<InsertOneWriteOpResult> {
        return undefined;
    }

    insertMany(docs: Object[], optionsOrCallback?: any, callback?: MongoCallback<InsertWriteOpResult>): Promise<InsertWriteOpResult> {
        return undefined;
    }

    insertOne(docs: Object, optionsOrCallback?: any, callback?: MongoCallback<InsertOneWriteOpResult>): Promise<InsertOneWriteOpResult> {
        return undefined;
    }

    isCapped(callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    listIndexes(options?: any): CommandCursor {
        return undefined;
    }

    mapReduce(map: Function|string, reduce: Function|string, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    options(callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    parallelCollectionScan(optionsOrCallback?: any, callback?: MongoCallback<Cursor[]>): Promise<Cursor[]> {
        return undefined;
    }

    reIndex(callback?: MongoCallback<any>): Promise<any> {
        return undefined;
    }

    remove(selector: Object, optionsOrCallback?: any, callback?: MongoCallback<WriteOpResult>): Promise<WriteOpResult> {
        return undefined;
    }

    rename(newName: string, optionsOrCallback?: any, callback?: MongoCallback<Collection>): Promise<Collection>  {
        return undefined;
    }

    replaceOne(filter: Object, doc: Object, optionsOrCallback?: any, callback?: MongoCallback<UpdateWriteOpResult>): Promise<UpdateWriteOpResult> {
        return undefined;
    }

    save(doc: Object, optionsOrOptions?: any, callback?: MongoCallback<WriteOpResult>): Promise<WriteOpResult> {
        return undefined;
    }

    stats(optionsOrCallback?: any, callback?: MongoCallback<CollStats>): Promise<CollStats> {
        return undefined;
    }

    update(filter: Object, update: Object, optionsOrCallback?: any, callback?: MongoCallback<WriteOpResult>): Promise<WriteOpResult> {

        throw new Error("deprecated");
    }

    updateMany(filter: Object, update: Object, optionsOrCallback?: any, callback?: MongoCallback<UpdateWriteOpResult>): Promise<UpdateWriteOpResult> {

        if (this.onUpdateMany) {
            process.nextTick(() => this.onUpdateMany(filter, update, optionsOrCallback, callback));
            return;
        }
    }

    onUpdateMany: (filter: Object, update: any, options: any, callback: (err: Error, result: any) => void) => void;

    updateOne(filter: Object, update: Object, optionsOrCallback?: any, callback?: MongoCallback<UpdateWriteOpResult>): Promise<UpdateWriteOpResult> {
        return undefined;
    }

    createCursor(): Cursor {
        return new MockCursor(this.contents);
    }
}
