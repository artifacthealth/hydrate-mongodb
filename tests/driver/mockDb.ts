import * as mongodb from "mongodb";
import {MockCollection} from "./mockCollection";
import {EventEmitter} from "events";
import {MongoCallback} from "mongodb";
import {ProfilingLevel} from "mongodb";
import {ClientSession} from "mongodb";

export class MockDb extends EventEmitter implements mongodb.Db {

    serverConfig: mongodb.Server | mongodb.ReplSet | mongodb.Mongos;
    bufferMaxEntries: number;
    databaseName: string;
    options: any;
    native_parser: boolean;
    slaveOk: boolean;
    writeConcern: any;
    cachedCollections: Map<string, MockCollection> = new Map();

    constructor(name: string = "test") {
        super();

        this.databaseName = name;
    }

    addUser(username: string, password: string, callback: mongodb.MongoCallback<any>): void;
    addUser(username: string, password: string, options?: mongodb.DbAddUserOptions): Promise<any>;
    addUser(username: string, password: string, options: mongodb.DbAddUserOptions, callback: mongodb.MongoCallback<any>): void;
    addUser(username: any, password: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    admin(): mongodb.Admin {
        throw new Error("Method not implemented.");
    }

    collection<TSchema = any>(name: string): mongodb.Collection<TSchema>;
    collection<TSchema = any>(name: string, callback: mongodb.MongoCallback<mongodb.Collection<TSchema>>): mongodb.Collection<TSchema>;
    collection<TSchema = any>(name: string, options: mongodb.DbCollectionOptions, callback: mongodb.MongoCallback<mongodb.Collection<TSchema>>): mongodb.Collection<TSchema>;
    collection(collectionName: any, optionsOrCallback?: any, callback?: any): any {

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

    collections(): Promise<mongodb.Collection<any>[]>;
    collections(callback: mongodb.MongoCallback<mongodb.Collection<any>[]>): void;
    collections(callback?: any): any {
        throw new Error("Method not implemented.");
    }

    command(command: Object, callback: mongodb.MongoCallback<any>): void;
    command(command: Object, options?: { readPreference: string | mongodb.ReadPreference; }): Promise<any>;
    command(command: Object, options: { readPreference: string | mongodb.ReadPreference; }, callback: mongodb.MongoCallback<any>): void;
    command(command: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    createCollection<TSchema = any>(name: string, callback: mongodb.MongoCallback<mongodb.Collection<TSchema>>): void;
    createCollection<TSchema = any>(name: string, options?: mongodb.CollectionCreateOptions): Promise<mongodb.Collection<TSchema>>;
    createCollection<TSchema = any>(name: string, options: mongodb.CollectionCreateOptions, callback: mongodb.MongoCallback<mongodb.Collection<TSchema>>): void;
    createCollection(name: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    createIndex(name: string, fieldOrSpec: string | Object, callback: mongodb.MongoCallback<any>): void;
    createIndex(name: string, fieldOrSpec: string | Object, options?: mongodb.IndexOptions): Promise<any>;
    createIndex(name: string, fieldOrSpec: string | Object, options: mongodb.IndexOptions, callback: mongodb.MongoCallback<any>): void;
    createIndex(name: any, fieldOrSpec: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    dropCollection(name: string): Promise<boolean>;
    dropCollection(name: string, callback: mongodb.MongoCallback<boolean>): void;
    dropCollection(name: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    dropDatabase(): Promise<any>;
    dropDatabase(callback: mongodb.MongoCallback<any>): void;
    dropDatabase(callback?: any): any {
        throw new Error("Method not implemented.");
    }

    executeDbAdminCommand(command: Object, callback: mongodb.MongoCallback<any>): void;
    executeDbAdminCommand(command: Object, options?: { readPreference?: string | mongodb.ReadPreference; maxTimeMS?: number; }): Promise<any>;
    executeDbAdminCommand(command: Object, options: { readPreference?: string | mongodb.ReadPreference; maxTimeMS?: number; }, callback: mongodb.MongoCallback<any>): void;
    executeDbAdminCommand(command: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    indexInformation(name: string, callback: mongodb.MongoCallback<any>): void;
    indexInformation(name: string, options?: { full?: boolean; readPreference?: string | mongodb.ReadPreference; }): Promise<any>;
    indexInformation(name: string, options: { full?: boolean; readPreference?: string | mongodb.ReadPreference; }, callback: mongodb.MongoCallback<any>): void;
    indexInformation(name: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    listCollections(filter?: Object, options?: { batchSize?: number; readPreference?: string | mongodb.ReadPreference; }): mongodb.CommandCursor {
        throw new Error("Method not implemented.");
    }

    profilingInfo(callback: mongodb.MongoCallback<any>): void;
    profilingInfo(options?: { session?: any; }): Promise<void>;
    profilingInfo(options: { session?: any; }, callback: mongodb.MongoCallback<void>): void;
    profilingInfo(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    profilingLevel(callback: MongoCallback<ProfilingLevel>): void;
    profilingLevel(options?: { session?: ClientSession }): Promise<ProfilingLevel>;
    profilingLevel(options: { session?: ClientSession }, callback: MongoCallback<ProfilingLevel>): void;
    profilingLevel(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    removeUser(username: string, callback: mongodb.MongoCallback<any>): void;
    removeUser(username: string, options?: mongodb.CommonOptions): Promise<any>;
    removeUser(username: string, options: mongodb.CommonOptions, callback: mongodb.MongoCallback<any>): void;
    removeUser(username: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    renameCollection<TSchema = any>(fromCollection: string, toCollection: string, callback: mongodb.MongoCallback<mongodb.Collection<TSchema>>): void;
    renameCollection<TSchema = any>(fromCollection: string, toCollection: string, options?: { dropTarget?: boolean; }): Promise<mongodb.Collection<TSchema>>;
    renameCollection<TSchema = any>(fromCollection: string, toCollection: string, options: { dropTarget?: boolean; }, callback: mongodb.MongoCallback<mongodb.Collection<TSchema>>): void;
    renameCollection(fromCollection: any, toCollection: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    stats(callback: mongodb.MongoCallback<any>): void;
    stats(options?: { scale?: number; }): Promise<any>;
    stats(options: { scale?: number; }, callback: mongodb.MongoCallback<any>): void;
    stats(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    setProfilingLevel(level: ProfilingLevel, callback: MongoCallback<ProfilingLevel>): void;
    setProfilingLevel(level: ProfilingLevel, options?: { session?: ClientSession }): Promise<ProfilingLevel>;
    setProfilingLevel(level: ProfilingLevel, options: { session?: ClientSession }, callback: MongoCallback<ProfilingLevel>): void;
    setProfilingLevel(level?: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }
}
