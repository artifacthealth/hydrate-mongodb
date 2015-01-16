import DriverCursor = require("./driver/cursor");
import Persister = require("./persister");

class Cursor {

    private _persister: Persister;
    private _cursor: DriverCursor;

    constructor(persister: Persister, cursor: DriverCursor) {
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

    nextObject(callback: (err: Error, entity?: any) => void): void {

        this._cursor.nextObject((err, document) => {
            if(err) return callback(err, undefined);
            var result = this._persister.loadOne(document);
            if(result.error) {
                return callback(result.error);
            }
            callback(null, result.value);
        });
    }

    each(callback: (err: Error, entity?: any) => boolean): void {

        this._cursor.each((err, document) => {
            if(err) return callback(err, undefined);
            var result = this._persister.loadOne(document);
            if(result.error) {
                return callback(result.error);
            }
            callback(null, result.value);
        });
    }

    forEach(iterator: (entity: any) => void, callback: (err: Error) => void): void {

        this._cursor.forEach((document) => {
            var result = this._persister.loadOne(document);
            if(result.error) {
                return callback(result.error);
            }
            iterator(result.value);
        }, callback);
    }

    toArray(callback: (err: Error, results?: any[]) => void): void {

        this._cursor.toArray((err, documents) => {
            if(err) return callback(err, undefined);

            var result = this._persister.load(documents);
            if(result.error) {
                return callback(result.error);
            }
            callback(null, result.value);
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
