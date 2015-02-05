/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import Cursor = require("../../src/driver/cursor");

class MockCursor implements Cursor {

    private _closed = false;

    constructor(public contents: any[]) {

    }

    filter(filter: any): Cursor {

        return this;
    }

    project(value: any): Cursor {

        return this;
    }

    rewind() : Cursor {

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

    sort(keyOrList: any, directionOrCallback: any, callback?: (err: Error, result: any) => void): Cursor {

        return this;
    }

    limit(limit: number, callback?: (err: Error, result: any) => void): Cursor {

        return this;
    }

    setReadPreference(preference: string, callback?: Function): Cursor {

        return this;
    }

    skip(skip: number, callback?: (err: Error, result: any) => void): Cursor {

        return this;
    }

    batchSize(batchSize: number, callback?: (err: Error, result: any) => void): Cursor {

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

export = MockCursor;