/// <reference path="../typings/async.d.ts" />

import async = require("async");
import DriverCursor = require("./driver/cursor");
import UnitOfWork = require("./unitOfWork");

class Cursor {

    private _innerCursor: DriverCursor;
    private _uow: UnitOfWork;

    constructor(innerCursor: DriverCursor, uow: UnitOfWork) {

        this._innerCursor = innerCursor;
        this._uow = uow;
    }

    filter(filter: any): Cursor {

        this._innerCursor.filter(filter);
        return this;
    }

    project(value: any): Cursor {

        this._innerCursor.project(value);
        return this;
    }

    sort(list: any): Cursor;
    sort(key: string, direction: number): Cursor;
    sort(keyOrList: any, direction?: number): Cursor {

        this._innerCursor.sort(keyOrList, direction);
        return this;
    }

    batchSize(value: number): Cursor {

        this._innerCursor.batchSize(value);
        return this;
    }

    limit(value: number): Cursor {

        this._innerCursor.limit(value);
        return this;
    }

    skip(value: number): Cursor {

        this._innerCursor.skip(value);
        return this;
    }

    nextObject(callback: (err: Error, result: any) => void): void {

        this._innerCursor.nextObject((err, result) => {
            if(err) return callback(err, null);

            this._uow.load(result, (err, result) => {
                if(err) return callback(err, null);

                callback(null, result);
            });
        });
    }

    each(callback: (err: Error, result: any) => boolean): void {

        this._innerCursor.each((err: Error, result: any) => {
            if(err) return callback(err, null);

            this._uow.load(result, (err, result) => {
                if(err) return callback(err, null);

                callback(null, result);
            });
        });
    }

    forEach(iterator: (value: any) => void, callback: (err: Error) => void): void {

        this._innerCursor.forEach((value: any) => {

            this._uow.load(value, (err, result) => {
                if(err) return callback(err);

                iterator(result);
            });
        }, callback);
    }

    toArray(callback: (err: Error, results: any[]) => void): void {

        this._innerCursor.toArray((err, results) => {
            if(err) return callback(err, null);

            async.map(results, (item, callback) => {
                this._uow.load(item, callback);
            }, callback);
        });
    }

    count(applySkipLimit: boolean, callback: (err: Error, result: number) => void): void {

        this._innerCursor.count(applySkipLimit, callback);
    }

    close(callback: (err: Error) => void): void {

        this._innerCursor.close(callback);
    }

    isClosed(): boolean {

        return this._innerCursor.isClosed();
    }

    explain(callback: (err: Error, result: any) => void) {

        this._innerCursor.explain(callback);
    }

    rewind(): Cursor {

        this._innerCursor.rewind();
        return this;
    }
}

export = Cursor;
