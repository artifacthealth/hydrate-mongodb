import { Db, Collection, DbCollectionOptions, Server, ReplSet, Mongos,
    MongoCallback, Admin, ReadPreference, CommandCursor } from "mongodb";
import {MockCursor} from "./mockCursor";
import {MockCollection} from "./mockCollection";
import {EventEmitter} from 'events';

export class MockDb extends EventEmitter implements Db {

    serverConfig: Server|ReplSet|Mongos;
    bufferMaxEntries: number;
    options: any;
    native_parser: boolean;
    slaveOk: boolean;
    writeConcern: any;

    addUser(username: string, password: string, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    admin(): Admin {
        return undefined;
    }

    authenticate(userName: string, password: string, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    close(forceCloseOrCallback?: any, callback?: MongoCallback<void>): Promise<void> {
        return undefined;
    }

    collections(callback?: MongoCallback<Collection[]>): Promise<Collection[]> {
        return undefined;
    }

    command(command: Object, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    createCollection(name: string, optionsOrCallback?: any, callback?: MongoCallback<Collection>): Promise<Collection> {
        throw new Error("Not implemented");
    }

    createIndex(name: string, fieldOrSpec: string|Object, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    dropCollection(nameOrCallback: any, callback?: MongoCallback<boolean>): Promise<boolean> {
        throw new Error("Not implemented");
    }

    dropDatabase(nameOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    executeDbAdminCommand(command: Object, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    indexInformation(name: string, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any>  {
        throw new Error("Not implemented");
    }

    logout(optionsOrCallback?: any, callback?: MongoCallback<any>):  Promise<any> {
        throw new Error("Not implemented");
    }

    open(callback?: MongoCallback<Db>): Promise<Db> {
        throw new Error("Not implemented");
    }

    removeUser(username: string, optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    renameCollection(fromCollection: string, toCollection: string, optionsOrCallback?: any, callback?: MongoCallback<Collection>): Promise<Collection> {
        throw new Error("Not implemented");
    }

    stats(optionsOrCallback?: any, callback?: MongoCallback<any>): Promise<any> {
        throw new Error("Not implemented");
    }

    databaseName: string;
    cachedCollections: Map<string, Collection> = new Map();

    constructor(name: string = "test") {
        super();
        this.databaseName = name;
    }

    db(dbName: string): Db {
        return new MockDb(dbName);
    }

    listCollections(filter: any, options?: {batchSize?: number; readPreference?: (ReadPreference|string)}): CommandCursor {
        return new MockCursor([filter.name]);
    }

    collection(collectionName: string): Collection;
    collection(collectionName: string, callback: (err: Error, collection: Collection) => void ): Collection;
    collection(collectionName: string, options: DbCollectionOptions, callback: (err: Error, collection: Collection) => void): Collection;
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

}