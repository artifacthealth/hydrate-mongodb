import { Db, Cursor, Collection, MongoCollectionOptions, CollectionCreateOptions, IndexOptions } from "mongodb";
import {MockCursor} from "./mockCursor";
import {MockBulk} from "./mockBulk";
import {MockCollection} from "./mockCollection";

export class MockDb implements Db {

    databaseName: string;
    cachedCollections: Map<string, Collection> = new Map();

    constructor(name: string = "test") {
        this.databaseName = name;
    }

    db(dbName: string): Db {
        return new MockDb(dbName);
    }

    open(callback: (err : Error, db : Db) => void ): void {
        throw new Error("Not implemented");
    }

    close(forceClose?: boolean, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    admin(callback: (err: Error, result: any) => void ): any {
        throw new Error("Not implemented");
    }

    collectionsInfo(collectionName: string, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    collectionNames(collectionName: string, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    listCollections(filter: any): Cursor {
        return new MockCursor([filter.name]);
    }

    collection(collectionName: string): Collection;
    collection(collectionName: string, callback: (err: Error, collection: Collection) => void ): Collection;
    collection(collectionName: string, options: MongoCollectionOptions, callback: (err: Error, collection: Collection) => void): Collection;
    collection(collectionName: string, optionsOrCallback?: any, callback?: (err: Error, collection: Collection) => void): Collection  {

        if(callback === undefined) {
            callback = optionsOrCallback;
        }

        var collection = this.cachedCollections.get(collectionName);
        if(!collection) {
            collection = new MockCollection([], collectionName);
            this.cachedCollections.set(collectionName, collection);
            if(callback) {
                process.nextTick(() => callback(null, collection));
            }
        }

        return collection;
    }

    collections(callback: (err: Error, collections: Collection[]) => void ): void {
        throw new Error("Not implemented");
    }

    eval(code: any, parameters: any[], options?: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    logout(callback: (err: Error, result: any) => void ): void;
    logout(options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    authenticate(userName: string, password: string, callback?: (err: Error, result: any) => void ): void;
    authenticate(userName: string, password: string, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    addUser(username: string, password: string, callback?: (err: Error, result: any) => void ): void;
    addUser(username: string, password: string, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    removeUser(username: string, callback?: (err: Error, result: any) => void ): void;
    removeUser(username: string, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    createCollection(collectionName: string, callback?: (err: Error, result: Collection) => void ): void;
    createCollection(collectionName: string, options: CollectionCreateOptions, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    command(selector: Object, callback?: (err: Error, result: any) => void ): void;
    command(selector: Object, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    dropCollection(collectionName: string, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    renameCollection(fromCollection: string, toCollection: string, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    lastError(options: Object, connectionOptions: any, callback: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    previousError(options: Object, callback: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    executeDbCommand(command_hash: any, callback?: (err: Error, result: any) => void ): void;
    executeDbCommand(command_hash: any, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    executeDbAdminCommand(command_hash: any, callback?: (err: Error, result: any) => void ): void;
    executeDbAdminCommand(command_hash: any, options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    resetErrorHistory(callback?: (err: Error, result: any) => void ): void;
    resetErrorHistory(options: any, callback?: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    createIndex(collectionName: any, fieldOrSpec: any, options: IndexOptions, callback: Function): void {
        throw new Error("Not implemented");
    }

    ensureIndex(collectionName: any, fieldOrSpec: any, options: IndexOptions, callback: Function): void {
        throw new Error("Not implemented");
    }

    cursorInfo(options: any, callback: Function): void {
        throw new Error("Not implemented");
    }

    dropIndex(collectionName: string, indexName: string, callback: Function): void {
        throw new Error("Not implemented");
    }

    reIndex(collectionName: string, callback: Function): void {
        throw new Error("Not implemented");
    }

    indexInformation(collectionName: string, options: any, callback: Function): void {
        throw new Error("Not implemented");
    }

    dropDatabase(callback: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    stats(options: any, callback: Function): void {
        throw new Error("Not implemented");
    }

    _registerHandler(db_command: any, raw: any, connection: any, exhaust: any, callback: Function): void {
        throw new Error("Not implemented");
    }

    _reRegisterHandler(newId: any, object: any, callback: Function): void {
        throw new Error("Not implemented");
    }

    _callHandler(id: any, document: any, err: any): any {
        throw new Error("Not implemented");
    }

    _hasHandler(id: any): any {
        throw new Error("Not implemented");
    }

    _removeHandler(id: any): any {
        throw new Error("Not implemented");
    }

    _findHandler(id: any): { id: string; callback: Function; } {
        throw new Error("Not implemented");
    }

    __executeQueryCommand(self: any, db_command: any, options: any, callback: any): void {
        throw new Error("Not implemented");
    }

    DEFAULT_URL: string;

    connect(url: string, options: { uri_decode_auth?: boolean; }, callback: (err: Error, result: any) => void ): void {
        throw new Error("Not implemented");
    }

    addListener(event: string, handler:(param: any) => any): any {
        throw new Error("Not implemented");
    }
}