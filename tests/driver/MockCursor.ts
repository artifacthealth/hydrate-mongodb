import * as mongodb from "mongodb";
import * as async from "async";

export class MockCursor implements mongodb.Cursor {

    private _closed = false;

    private _sorting: any[];

    constructor(public contents: any[] = []) {

    }

    stream(): mongodb.CursorStream {
        throw new Error("Not implemented");
    }

    filter(filter: any): mongodb.Cursor {

        return this;
    }

    project(value: any): mongodb.Cursor {

        return this;
    }

    rewind() : mongodb.Cursor {

        return this;
    }

    toArray(callback: (err: Error, results: any[]) => any) : void {
        process.nextTick(() => {
            callback(null, this.contents);
        });
    }

    each(callback: (err: Error, item: any) => boolean) : void {

    }

    forEach(iterator: (value: any) => void, callback: (err: Error) => void): void {

        async.each(this.contents, iterator, callback);
    }

    count(applySkipLimit: boolean, callback: (err: Error, count: number) => void) : void {

    }

    sort(keyOrList: any, directionOrCallback: any, callback?: (err: Error, result: any) => void): mongodb.Cursor {

        if(this.onSort) {
            return this.onSort(keyOrList, directionOrCallback, callback);
        }

        return this;
    }

    onSort: (keyOrList: any, directionOrCallback: any, callback?: (err: Error, result: any) => void) => mongodb.Cursor;

    limit(limit: number, callback?: (err: Error, result: any) => void): mongodb.Cursor {

        return this;
    }

    setReadPreference(preference: string, callback?: Function): mongodb.Cursor {

        return this;
    }

    skip(skip: number, callback?: (err: Error, result: any) => void): mongodb.Cursor {

        return this;
    }

    batchSize(batchSize: number, callback?: (err: Error, result: any) => void): mongodb.Cursor {

        return this;
    }

    nextObject(callback: (err: Error, doc: any) => void) : void {

    }

    explain(callback: (err: Error, result: any) => void) : void {

    }

    close(callback: (err: Error, result: any) => void) : void {

        this._closed = true;
    }

    isClosed(): boolean {

        return this._closed;
    }
}
