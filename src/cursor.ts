import DriverCursor = require("./driver/cursor");
import Persister = require("./persister");
import InternalSession = require("./internalSession");

class Cursor {

    private _session: InternalSession;
    private _persister: Persister;
    private _cursor: DriverCursor;

    constructor(session: InternalSession, persister: Persister, cursor: DriverCursor) {
        this._session = session;
        this._persister = persister;
        this._cursor = cursor;
    }

    filter(filter: any): Cursor {

        this._cursor.filter(filter);
        return this;
    }

    sort(list: any): Cursor;
    sort(key: string, direction: number): Cursor;
    sort(keyOrList: any, direction?: number): Cursor {

        this._cursor.sort(keyOrList, direction);
        return this;
    }

    limit(value: number): Cursor {

        this._cursor.limit(value);
        return this;
    }

    skip(value: number): Cursor {

        this._cursor.skip(value);
        return this;
    }

    nextObject(callback: (err: Error, result: any) => void): void {

        this._cursor.nextObject((err, result) => {
            if(err) return callback(err, undefined);
            // TODO: load single entity
        });
    }

    each(callback: (err: Error, result: any) => boolean): void {

        this._cursor.each((err, result) => {
            if(err) return callback(err, undefined);
            // TODO: load single entity
        });
    }

    forEach(iterator: (value: any) => void, callback: (err: Error) => void): void {

        this._cursor.forEach((value) => {
            // TODO: load single entity
        }, callback);
    }

    toArray(callback: (err: Error, results: any[]) => void): void {

        this._cursor.toArray((err, results) => {
            if(err) return callback(err, undefined);
            // TODO: load array of entities
        });
    }

    count(callback: (err: Error, result: number) => void): void {

        this._cursor.count(false, callback);
    }

    close(callback: (err: Error) => void): void {

        this._cursor.close(callback);
    }

    isClosed(): boolean {

        return this._cursor.isClosed();
    }

    rewind(): Cursor {

        this._cursor.rewind();
        return this;
    }
}

export = Cursor;
