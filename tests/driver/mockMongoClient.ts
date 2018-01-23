import * as mongodb from "mongodb";
import {MockDb} from "./mockDb";

export class MockMongoClient implements mongodb.MongoClient {

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

    isConnected(name: string, options?: mongodb.MongoClientCommonOption): boolean {
        throw new Error("Method not implemented.");
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

    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }

    on(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }

    once(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }

    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }

    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }

    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error("Method not implemented.");
    }

    removeAllListeners(event?: string | symbol): this {
        throw new Error("Method not implemented.");
    }

    setMaxListeners(n: number): this {
        throw new Error("Method not implemented.");
    }

    getMaxListeners(): number {
        throw new Error("Method not implemented.");
    }

    listeners(event: string | symbol): Function[] {
        throw new Error("Method not implemented.");
    }

    emit(event: string | symbol, ...args: any[]): boolean {
        throw new Error("Method not implemented.");
    }

    eventNames(): (string | symbol)[] {
        throw new Error("Method not implemented.");
    }

    listenerCount(type: string | symbol): number {
        throw new Error("Method not implemented.");
    }
}
