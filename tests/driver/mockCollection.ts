import * as mongodb from "mongodb";
import {MockCursor} from "./mockCursor";
import {MockBulk} from "./mockBulk";
import {MongoCallback} from "mongodb";
import {AggregationCursor} from "mongodb";
import {CollectionAggregationOptions} from "mongodb";
import {MongoCountPreferences} from "mongodb";
import {BulkWriteOpResultObject} from "mongodb";
import {CollectionBulkWriteOptions} from "mongodb";

export class MockCollection<TSchema = any> implements mongodb.Collection {

    collectionName: string;
    namespace: string;
    writeConcern: any;
    readConcern: any;
    hint: any;
    bulk: MockBulk;

    constructor(public contents?: any[], name?: string) {

        this.collectionName = name;
    }

    aggregate<T = TSchema>(callback: MongoCallback<AggregationCursor<T>>): AggregationCursor<T>;
    aggregate<T = TSchema>(pipeline: Object[], callback: MongoCallback<AggregationCursor<T>>): AggregationCursor<T>;
    aggregate<T = TSchema>(pipeline?: Object[], options?: CollectionAggregationOptions, callback?: MongoCallback<AggregationCursor<T>>): AggregationCursor<T>;
    aggregate(pipeline: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    bulkWrite(operations: Object[], callback: MongoCallback<BulkWriteOpResultObject>): void;
    bulkWrite(operations: Object[], options?: CollectionBulkWriteOptions): Promise<BulkWriteOpResultObject>;
    bulkWrite(operations: Object[], options: CollectionBulkWriteOptions, callback: MongoCallback<BulkWriteOpResultObject>): void;
    bulkWrite(operations: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    count(query: Object, callback: mongodb.MongoCallback<number>): void;
    count(query: Object, options?: mongodb.MongoCountPreferences): Promise<number>;
    count(query: Object, options: mongodb.MongoCountPreferences, callback: mongodb.MongoCallback<number>): void;
    count(query: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    countDocuments(callback: MongoCallback<number>): void;
    countDocuments(query: Object, callback: MongoCallback<number>): void;
    countDocuments(query?: Object, options?: MongoCountPreferences): Promise<number>;
    countDocuments(query: Object, options: MongoCountPreferences, callback: MongoCallback<number>): void;
    countDocuments(query: any, options?: any, callback?: MongoCallback<number>): any {
        throw new Error("Method not implemented.");
    }

    createIndex(fieldOrSpec: any, callback: mongodb.MongoCallback<string>): void;
    createIndex(fieldOrSpec: any, options?: mongodb.IndexOptions): Promise<string>;
    createIndex(fieldOrSpec: any, options: mongodb.IndexOptions, callback: mongodb.MongoCallback<string>): void;
    createIndex(fieldOrSpec: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    createIndexes(indexSpecs: Object[], callback: mongodb.MongoCallback<any>): void;
    createIndexes(indexSpecs: Object[], options?: { session?: any; }): Promise<any>;
    createIndexes(indexSpecs: Object[], options: { session?: any; }, callback: mongodb.MongoCallback<any>): void;
    createIndexes(indexSpecs: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    deleteMany(filter: Object, callback: mongodb.MongoCallback<mongodb.DeleteWriteOpResultObject>): void;
    deleteMany(filter: Object, options?: mongodb.CommonOptions): Promise<mongodb.DeleteWriteOpResultObject>;
    deleteMany(filter: Object, options: mongodb.CommonOptions, callback: mongodb.MongoCallback<mongodb.DeleteWriteOpResultObject>): void;
    deleteMany(filter: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    deleteOne(filter: Object, callback: mongodb.MongoCallback<mongodb.DeleteWriteOpResultObject>): void;
    deleteOne(filter: Object, options?: mongodb.CommonOptions & { bypassDocumentValidation?: boolean; }): Promise<mongodb.DeleteWriteOpResultObject>;
    deleteOne(filter: Object, options: mongodb.CommonOptions & { bypassDocumentValidation?: boolean; }, callback: mongodb.MongoCallback<mongodb.DeleteWriteOpResultObject>): void;
    deleteOne(filter: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    distinct(key: string, query: Object, callback: mongodb.MongoCallback<any>): void;
    distinct(key: string, query: Object, options?: { readPreference?: string | mongodb.ReadPreference; maxTimeMS?: number; session?: any; }): Promise<any>;
    distinct(key: string, query: Object, options: { readPreference?: string | mongodb.ReadPreference; maxTimeMS?: number; session?: any; }, callback: mongodb.MongoCallback<any>): void;
    distinct(key: any, query: any, options?: any, callback?: any): any {
        if (this.onDistinct) {
            process.nextTick(() => this.onDistinct(key, query, options, callback));
            return;
        }
    }

    onDistinct: (key: string, query: Object, options: any, callback: (err: Error, result: any) => void) => void;

    drop(options?: { session: any; }): Promise<any>;
    drop(callback: mongodb.MongoCallback<any>): void;
    drop(options: { session: any; }, callback: mongodb.MongoCallback<any>): void;
    drop(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    dropIndex(indexName: string, callback: mongodb.MongoCallback<any>): void;
    dropIndex(indexName: string, options?: mongodb.CommonOptions & { maxTimeMS?: number; }): Promise<any>;
    dropIndex(indexName: string, options: mongodb.CommonOptions & { maxTimeMS?: number; }, callback: mongodb.MongoCallback<any>): void;
    dropIndex(indexName: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    dropIndexes(options?: { session?: any; maxTimeMS?: number; }): Promise<any>;
    dropIndexes(callback?: mongodb.MongoCallback<any>): void;
    dropIndexes(options: { session?: any; maxTimeMS?: number; }, callback: mongodb.MongoCallback<any>): void;
    dropIndexes(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    find<T = any>(query?: Object): mongodb.Cursor<T>;
    find<T = any>(query: Object, options?: mongodb.FindOneOptions): mongodb.Cursor<T>;
    find(query?: any, options?: any): any {

        if (this.onFind) {
            return this.onFind(query, options);
        }

        return this.createCursor();
    }

    createCursor(): MockCursor {
        return new MockCursor(this.contents);
    }

    onFind: (selector: Object, options: mongodb.FindOneOptions) => mongodb.Cursor;

    findOne<T = any>(filter: Object, callback: mongodb.MongoCallback<T>): void;
    findOne<T = any>(filter: Object, options?: mongodb.FindOneOptions): Promise<T>;
    findOne<T = any>(filter: Object, options: mongodb.FindOneOptions, callback: mongodb.MongoCallback<T>): void;
    findOne(filter: any, optionsOrCallback?: any, callback?: any): any {

        var options: Object;

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

    onFindOne: (selector: Object, options: mongodb.FindOneOptions, callback?: (err: Error, result: any) => void) => any;

    findOneAndDelete(filter: Object, callback: mongodb.MongoCallback<mongodb.FindAndModifyWriteOpResultObject<any>>): void;
    findOneAndDelete(filter: Object, options?: { projection?: Object; sort?: Object; maxTimeMS?: number; session?: any; }): Promise<mongodb.FindAndModifyWriteOpResultObject<any>>;
    findOneAndDelete(filter: Object, options: { projection?: Object; sort?: Object; maxTimeMS?: number; session?: any; }, callback: mongodb.MongoCallback<mongodb.FindAndModifyWriteOpResultObject<any>>): void;
    findOneAndDelete(filter: any, optionsOrCallback?: any, callback?: any): any {

        if (typeof optionsOrCallback === "function") {
            callback = optionsOrCallback;
            optionsOrCallback = {};
        }

        process.nextTick(() => this.onFindOneAndDelete(filter, optionsOrCallback, callback));
    }

    onFindOneAndDelete: (filter: any, options: any, callback: any) => void;

    findOneAndReplace(filter: Object, replacement: Object, callback: mongodb.MongoCallback<mongodb.FindAndModifyWriteOpResultObject<any>>): void;
    findOneAndReplace(filter: Object, replacement: Object, options?: mongodb.FindOneAndReplaceOption): Promise<mongodb.FindAndModifyWriteOpResultObject<any>>;
    findOneAndReplace(filter: Object, replacement: Object, options: mongodb.FindOneAndReplaceOption, callback: mongodb.MongoCallback<mongodb.FindAndModifyWriteOpResultObject<any>>): void;
    findOneAndReplace(filter: any, replacement: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    findOneAndUpdate(filter: Object, update: Object, callback: mongodb.MongoCallback<mongodb.FindAndModifyWriteOpResultObject<any>>): void;
    findOneAndUpdate(filter: Object, update: Object, options?: mongodb.FindOneAndReplaceOption): Promise<mongodb.FindAndModifyWriteOpResultObject<any>>;
    findOneAndUpdate(filter: Object, update: Object, options: mongodb.FindOneAndReplaceOption, callback: mongodb.MongoCallback<mongodb.FindAndModifyWriteOpResultObject<any>>): void;
    findOneAndUpdate(filter: any, update: any, optionsOrCallback?: any, callback?: any): any {

        if (typeof optionsOrCallback === "function") {
            callback = optionsOrCallback;
            optionsOrCallback = {};
        }

        process.nextTick(() => this.onFindOneAndUpdate(filter, update, optionsOrCallback, callback));
    }

    onFindOneAndUpdate: (filter: any, update: any, options: any, callback: any) => void;

    geoHaystackSearch(x: number, y: number, callback: mongodb.MongoCallback<any>): void;
    geoHaystackSearch(x: number, y: number, options?: mongodb.GeoHaystackSearchOptions): Promise<any>;
    geoHaystackSearch(x: number, y: number, options: mongodb.GeoHaystackSearchOptions, callback: mongodb.MongoCallback<any>): void;
    geoHaystackSearch(x: any, y: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    geoNear(x: number, y: number, callback: mongodb.MongoCallback<any>): void;
    geoNear(x: number, y: number, options?: mongodb.GeoNearOptions): Promise<any>;
    geoNear(x: number, y: number, options: mongodb.GeoNearOptions, callback: mongodb.MongoCallback<any>): void;
    geoNear(x: any, y: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    group(keys: Object | Function | any[] | mongodb.Code, condition: Object, initial: Object, reduce: Function | mongodb.Code, finalize: Function | mongodb.Code, command: boolean, callback: mongodb.MongoCallback<any>): void;
    group(keys: Object | Function | any[] | mongodb.Code, condition: Object, initial: Object, reduce: Function | mongodb.Code, finalize: Function | mongodb.Code, command: boolean, options?: { readPreference?: string | mongodb.ReadPreference; }): Promise<any>;
    group(keys: Object | Function | any[] | mongodb.Code, condition: Object, initial: Object, reduce: Function | mongodb.Code, finalize: Function | mongodb.Code, command: boolean, options: { readPreference?: string | mongodb.ReadPreference; }, callback: mongodb.MongoCallback<any>): void;
    group(keys: any, condition: any, initial: any, reduce: any, finalize: any, command: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    indexes(options?: { session: any; }): Promise<any>;
    indexes(callback: mongodb.MongoCallback<any>): void;
    indexes(options: { session?: any; }, callback: mongodb.MongoCallback<any>): void;
    indexes(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    indexExists(indexes: string | string[], callback: mongodb.MongoCallback<boolean>): void;
    indexExists(indexes: string | string[], options?: { session: any; }): Promise<boolean>;
    indexExists(indexes: string | string[], options: { session: any; }, callback: mongodb.MongoCallback<boolean>): void;
    indexExists(indexes: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    indexInformation(callback: mongodb.MongoCallback<any>): void;
    indexInformation(options?: { full: boolean; session: any; }): Promise<any>;
    indexInformation(options: { full: boolean; session: any; }, callback: mongodb.MongoCallback<any>): void;
    indexInformation(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    initializeOrderedBulkOp(options?: mongodb.CommonOptions): mongodb.OrderedBulkOperation {
        throw new Error("Method not implemented.");
    }

    initializeUnorderedBulkOp(options?: mongodb.CommonOptions): mongodb.UnorderedBulkOperation {
        return this.bulk = new MockBulk();
    }

    insert(docs: Object, callback: mongodb.MongoCallback<mongodb.InsertOneWriteOpResult>): void;
    insert(docs: Object, options?: mongodb.CollectionInsertOneOptions): Promise<mongodb.InsertOneWriteOpResult>;
    insert(docs: Object, options: mongodb.CollectionInsertOneOptions, callback: mongodb.MongoCallback<mongodb.InsertOneWriteOpResult>): void;
    insert(docs: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    insertMany(docs: Object[], callback: mongodb.MongoCallback<mongodb.InsertWriteOpResult>): void;
    insertMany(docs: Object[], options?: mongodb.CollectionInsertManyOptions): Promise<mongodb.InsertWriteOpResult>;
    insertMany(docs: Object[], options: mongodb.CollectionInsertManyOptions, callback: mongodb.MongoCallback<mongodb.InsertWriteOpResult>): void;
    insertMany(docs: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    insertOne(docs: Object, callback: mongodb.MongoCallback<mongodb.InsertOneWriteOpResult>): void;
    insertOne(docs: Object, options?: mongodb.CollectionInsertOneOptions): Promise<mongodb.InsertOneWriteOpResult>;
    insertOne(docs: Object, options: mongodb.CollectionInsertOneOptions, callback: mongodb.MongoCallback<mongodb.InsertOneWriteOpResult>): void;
    insertOne(docs: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    isCapped(options?: { session: any; }): Promise<any>;
    isCapped(callback: mongodb.MongoCallback<any>): void;
    isCapped(options: { session: any; }, callback: mongodb.MongoCallback<any>): void;
    isCapped(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    listIndexes(options?: { batchSize?: number; readPreference?: string | mongodb.ReadPreference; session?: any; }): mongodb.CommandCursor {
        throw new Error("Method not implemented.");
    }

    mapReduce(map: string | Function, reduce: string | Function, callback: mongodb.MongoCallback<any>): void;
    mapReduce(map: string | Function, reduce: string | Function, options?: mongodb.MapReduceOptions): Promise<any>;
    mapReduce(map: string | Function, reduce: string | Function, options: mongodb.MapReduceOptions, callback: mongodb.MongoCallback<any>): void;
    mapReduce(map: any, reduce: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    options(options?: { session: any; }): Promise<any>;
    options(callback: mongodb.MongoCallback<any>): void;
    options(options: { session: any; }, callback: mongodb.MongoCallback<any>): void;
    options(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    parallelCollectionScan(callback: mongodb.MongoCallback<mongodb.Cursor<any>[]>): void;
    parallelCollectionScan(options?: mongodb.ParallelCollectionScanOptions): Promise<mongodb.Cursor<any>[]>;
    parallelCollectionScan(options: mongodb.ParallelCollectionScanOptions, callback: mongodb.MongoCallback<mongodb.Cursor<any>[]>): void;
    parallelCollectionScan(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    reIndex(options?: { session: any; }): Promise<any>;
    reIndex(callback: mongodb.MongoCallback<any>): void;
    reIndex(options: { session: any; }, callback: mongodb.MongoCallback<any>): void;
    reIndex(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    remove(selector: Object, callback: mongodb.MongoCallback<mongodb.WriteOpResult>): void;
    remove(selector: Object, options?: mongodb.CommonOptions & { single?: boolean; }): Promise<mongodb.WriteOpResult>;
    remove(selector: Object, options?: mongodb.CommonOptions & { single?: boolean; }, callback?: mongodb.MongoCallback<mongodb.WriteOpResult>): void;
    remove(selector: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    rename(newName: string, callback: mongodb.MongoCallback<mongodb.Collection<any>>): void;
    rename(newName: string, options?: { dropTarget?: boolean; session?: any; }): Promise<mongodb.Collection<any>>;
    rename(newName: string, options: { dropTarget?: boolean; session?: any; }, callback: mongodb.MongoCallback<mongodb.Collection<any>>): void;
    rename(newName: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    replaceOne(filter: Object, doc: Object, callback: mongodb.MongoCallback<mongodb.ReplaceWriteOpResult>): void;
    replaceOne(filter: Object, doc: Object, options?: mongodb.ReplaceOneOptions): Promise<mongodb.ReplaceWriteOpResult>;
    replaceOne(filter: Object, doc: Object, options: mongodb.ReplaceOneOptions, callback: mongodb.MongoCallback<mongodb.ReplaceWriteOpResult>): void;
    replaceOne(filter: any, doc: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    save(doc: Object, callback: mongodb.MongoCallback<mongodb.WriteOpResult>): void;
    save(doc: Object, options?: mongodb.CommonOptions): Promise<mongodb.WriteOpResult>;
    save(doc: Object, options: mongodb.CommonOptions, callback: mongodb.MongoCallback<mongodb.WriteOpResult>): void;
    save(doc: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    stats(callback: mongodb.MongoCallback<mongodb.CollStats>): void;
    stats(options?: { scale: number; session?: any; }): Promise<mongodb.CollStats>;
    stats(options: { scale: number; session?: any; }, callback: mongodb.MongoCallback<mongodb.CollStats>): void;
    stats(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    update(filter: Object, update: Object, callback: mongodb.MongoCallback<mongodb.WriteOpResult>): void;
    update(filter: Object, update: Object, options?: mongodb.ReplaceOneOptions & { multi?: boolean; }): Promise<mongodb.WriteOpResult>;
    update(filter: Object, update: Object, options: mongodb.ReplaceOneOptions & { multi?: boolean; }, callback: mongodb.MongoCallback<mongodb.WriteOpResult>): void;
    update(filter: any, update: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    updateMany(filter: Object, update: Object, callback: mongodb.MongoCallback<mongodb.UpdateWriteOpResult>): void;
    updateMany(filter: Object, update: Object, options?: mongodb.CommonOptions & { upsert?: boolean; }): Promise<mongodb.UpdateWriteOpResult>;
    updateMany(filter: Object, update: Object, options: mongodb.CommonOptions & { upsert?: boolean; }, callback: mongodb.MongoCallback<mongodb.UpdateWriteOpResult>): void;
    updateMany(filter: any, update: any, options?: any, callback?: any): any {
        if (this.onUpdateMany) {
            process.nextTick(() => this.onUpdateMany(filter, update, options, callback));
            return;
        }
    }

    onUpdateMany: (filter: Object, update: any, options: any, callback: (err: Error, result: any) => void) => void;

    updateOne(filter: Object, update: Object, callback: mongodb.MongoCallback<mongodb.UpdateWriteOpResult>): void;
    updateOne(filter: Object, update: Object, options?: mongodb.ReplaceOneOptions): Promise<mongodb.UpdateWriteOpResult>;
    updateOne(filter: Object, update: Object, options: mongodb.ReplaceOneOptions, callback: mongodb.MongoCallback<mongodb.UpdateWriteOpResult>): void;
    updateOne(filter: any, update: any, options?: any, callback?: any): any {
        if (this.onUpdateOne) {
            process.nextTick(() => this.onUpdateOne(filter, update, options, callback));
            return;
        }
    }

    onUpdateOne: (filter: Object, update: any, options: any, callback: (err: Error, result: any) => void) => void;

    watch(pipeline?: Object[], options?: mongodb.ChangeStreamOptions & { session?: any; }): mongodb.ChangeStream {
        throw new Error("Method not implemented.");
    }

    estimatedDocumentCount(callback: MongoCallback<number>): void;
    estimatedDocumentCount(query: Object, callback: MongoCallback<number>): void;
    estimatedDocumentCount(query?: Object, options?: MongoCountPreferences): Promise<number>;
    estimatedDocumentCount(query: Object, options: MongoCountPreferences, callback: MongoCallback<number>): void;
    estimatedDocumentCount(query?: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }
}
