import * as mongodb from "mongodb";
import {Readable} from "stream";
import {IteratorCallback} from "mongodb";
import {EndCallback} from "mongodb";

export class MockCursor extends Readable implements mongodb.Cursor {

    private _closed = false;

    private _sorting: any[];

    sortValue: string;
    projectValue: Object;
    timeout: boolean;
    readPreference: mongodb.ReadPreference;

    constructor(public contents: any[] = []) {
        super();
    }

    addCursorFlag(flag: string, value: boolean): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    addQueryModifier(name: string, value: boolean): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    batchSize(value: number): mongodb.Cursor<any> {
        return this;
    }

    clone(): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    close(): Promise<any>;
    close(callback: mongodb.MongoCallback<any>): void;
    close(callback?: any): any {
        this._closed = true;
    }

    comment(value: string): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    count(callback: mongodb.MongoCallback<number>): void;
    count(applySkipLimit: boolean, callback: mongodb.MongoCallback<number>): void;
    count(options: mongodb.CursorCommentOptions, callback: mongodb.MongoCallback<number>): void;
    count(applySkipLimit: boolean, options: mongodb.CursorCommentOptions, callback: mongodb.MongoCallback<number>): void;
    count(applySkipLimit?: boolean, options?: mongodb.CursorCommentOptions): Promise<number>;
    count(applySkipLimit?: any, options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    explain(): Promise<any>;
    explain(callback: mongodb.MongoCallback<any>): void;
    explain(callback?: any): any {
        throw new Error("Method not implemented.");
    }

    filter(filter: Object): mongodb.Cursor<any> {
        return this;
    }

    forEach<T>(iterator: IteratorCallback<T>, callback: EndCallback): void;
    forEach<T>(iterator: IteratorCallback<T>): Promise<void>;
    forEach<T>(iterator: mongodb.IteratorCallback<any>, callback?: mongodb.EndCallback): any {
        throw new Error("Method not implemented.");
    }

    hasNext(): Promise<boolean>;
    hasNext(callback: mongodb.MongoCallback<boolean>): void;
    hasNext(callback?: any): any {
        throw new Error("Method not implemented.");
    }

    hint(hint: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    isClosed(): boolean {
        return this._closed;
    }

    limit(value: number): mongodb.Cursor<any> {
        return this;
    }

    map(transform: Function): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    max(max: number): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    maxAwaitTimeMS(value: number): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    maxScan(maxScan: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    maxTimeMS(value: number): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    collation(value: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    min(min: number): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    next(): Promise<any>;
    next(callback: mongodb.MongoCallback<any>): void;
    next(callback?: any): any {
        callback();
    }

    project(value: Object): mongodb.Cursor<any> {
        this.projectValue = value;
        return this;
    }

    read(size: number): string | void | Buffer {
        throw new Error("Method not implemented.");
    }

    returnKey(returnKey: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    rewind(): void {
        throw new Error("Method not implemented.");
    }

    setCursorOption(field: string, value: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    setReadPreference(readPreference: string | mongodb.ReadPreference): mongodb.Cursor<any> {
        return this;
    }

    showRecordId(showRecordId: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    skip(value: number): mongodb.Cursor<any> {
        return this;
    }

    snapshot(snapshot: Object): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    sort(keyOrList: string | Object | Object[], direction?: number): mongodb.Cursor<any> {
        if(this.onSort) {
            return this.onSort(keyOrList, direction);
        }

        return this;
    }

    onSort: (keyOrList: any, directionOrCallback: any) => mongodb.Cursor;

    stream(options?: { transform?: Function; }): mongodb.Cursor<any> {
        throw new Error("Method not implemented.");
    }

    toArray(): Promise<any[]>;
    toArray(callback: mongodb.MongoCallback<any[]>): void;
    toArray(callback?: any): any {
        process.nextTick(() => {
            callback(null, this.contents);
        });
    }

    unshift(stream: string | Buffer): void {
        throw new Error("Method not implemented.");
    }
}
