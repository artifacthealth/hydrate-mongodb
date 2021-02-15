import * as mongodb from "mongodb";
import {MockDb} from "./mockDb";
import {EventEmitter} from "events";
import {MongoClientCommonOption} from "mongodb";

export class MockMongoClient extends EventEmitter implements mongodb.MongoClient {

    connect(): Promise<mongodb.MongoClient>;
    connect(callback: mongodb.MongoCallback<mongodb.MongoClient>): void;
    connect(callback?: any): any {
        throw new Error("Method not implemented.");
    }

    close(callback: mongodb.MongoCallback<void>): void;
    close(force?: boolean): Promise<void>;
    close(force: boolean, callback: mongodb.MongoCallback<void>): void;
    close(force?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    db(dbName: string, options?: mongodb.MongoClientCommonOption): mongodb.Db {
        return new MockDb(dbName);
    }

    logout(callback: mongodb.MongoCallback<any>): void;
    logout(options?: { dbName?: string; }): Promise<any>;
    logout(options: { dbName?: string; }, callback: mongodb.MongoCallback<any>): void;
    logout(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    startSession(options?: any): any {
        throw new Error("Method not implemented.");
    }

    isConnected(options?: MongoClientCommonOption): boolean {
        throw new Error("Method not implemented.");
    }

    watch(pipeline?: Object[], options?: mongodb.ChangeStreamOptions & { startAtClusterTime?: mongodb.Timestamp; session?: mongodb.ClientSession }): mongodb.ChangeStream {
        throw new Error("Method not implemented.");
    }

    withSession(operation: (session: mongodb.ClientSession) => Promise<any>): Promise<void>;
    withSession(options: mongodb.SessionOptions, operation: (session: mongodb.ClientSession) => Promise<any>): Promise<void>;
    withSession(options: any, operation?: any): any {
        throw new Error("Method not implemented.");
    }
}
