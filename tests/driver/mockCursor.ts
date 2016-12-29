import {Cursor, ReadPreference, CursorResult, MongoCallback, EndCallback, IteratorCallback, CommandCursor,
    AggregationCursorResult} from "mongodb";
import {Readable} from "stream";
import * as async from "async";

export class MockCursor extends Readable implements Cursor, CommandCursor {
   
    sortValue: string;
    timeout: boolean;
    readPreference: ReadPreference;

    private _closed = false;
    private _sorting: any[];

    constructor(public contents: any[] = []) {
        super();

    }

    addCursorFlag(flag: string, value: boolean): Cursor {
        return this;
    }

    addQueryModifier(name: string, value: boolean): Cursor {
        return this;
    }

    batchSize(value: number): any {
        return this;
    }

    clone(): any {
        return this;
    }

    close(callback?: MongoCallback<CursorResult>): Promise<CursorResult> {
        this._closed = true;

        return undefined;
    }

    comment(value: string): Cursor {
        return this;
    }

    count(applySkipLimit: boolean, optionsOrCallback?: any, callback?: MongoCallback<number>): Promise<number> {
        return undefined;
    }

    explain(callback?: MongoCallback<CursorResult>): Promise<CursorResult> {
        return undefined;
    }

    filter(filter: Object): Cursor {
        return this;
    }

    forEach(iterator: IteratorCallback, callback: EndCallback): void {
        async.each(this.contents, iterator, callback);
    }

    each(callback: MongoCallback<AggregationCursorResult>): void {
    }

    hasNext(callback?: MongoCallback<boolean>): Promise<boolean> {
        return undefined;
    }

    hint(hint: Object): Cursor {
        return this;
    }

    isClosed(): boolean {
        return this._closed;
    }

    limit(value: number): Cursor {
        return this;
    }

    map(transform: Function): Cursor {
        return this;
    }

    max(max: number): Cursor {
        return this;
    }

    maxAwaitTimeMS(value: number): Cursor {
        return this;
    }

    maxScan(maxScan: Object): Cursor {
        return this;
    }

    maxTimeMS(value: number): any {
        return this;
    }

    min(min: number): Cursor {
        return this;
    }

    next(callback?: MongoCallback<CursorResult>): Promise<CursorResult> {
        return undefined;
    }

    pipe(destination: any, options?: Object): void {
    }

    project(value: Object): Cursor {
        return this;
    }

    read(size: number): string|Buffer|void {
        return undefined;
    }

    returnKey(returnKey: Object): Cursor {
        return this;
    }

    rewind(): CommandCursor {
        return undefined;
    }

    setCursorOption(field: string, value: Object): Cursor {
        return this;
    }

    setEncoding(encoding: string): void {
    }

    setReadPreference(readPreference: string|ReadPreference): any {
        return this;
    }

    showRecordId(showRecordId: Object): Cursor {
        return this;
    }

    skip(value: number): Cursor {
        return this;
    }

    snapshot(snapshot: Object): Cursor {
        return this;
    }

    sort(keyOrList: any, directionOrCallback: any, callback?: (err: Error, result: any) => void): Cursor {

        if(this.onSort) {
            return this.onSort(keyOrList, directionOrCallback, callback);
        }

        return this;
    }

    onSort: (keyOrList: any, directionOrCallback: any, callback?: (err: Error, result: any) => void) => Cursor;


    stream(options?: {transform?: Function}): Cursor {
        return this;
    }

    toArray(callback?: MongoCallback<any[]>): Promise<any[]>  {

        if (callback) {
            process.nextTick(() => {
                callback(null, this.contents);
            });
        }

        return undefined;
    }

    unpipe(destination?: any): void {
    }

    unshift(stream: Buffer|string): void {
    }

}
