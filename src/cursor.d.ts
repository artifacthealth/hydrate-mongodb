import ResultCallback = require("./core/resultCallback");

interface Cursor<T> {

    filter(filter: any): Cursor<T>;
    sort(field: string, direction: number): Cursor<T>;
    sort(fields: [string, number][]): Cursor<T>
    limit(value: number): Cursor<T>;
    skip(value: number): Cursor<T>;
    rewind(): Cursor<T>;
    fetch(path: string): Cursor<T>;
    fetch(paths: string[]): Cursor<T>;

    isClosed(): boolean;

    nextObject(callback: (err: Error, entity?: T) => void): void;
    each(callback: (err: Error, entity?: T) => boolean): void;
    forEach(iterator: (entity: T) => void, callback: (err: Error) => void): void;
    toArray(callback: (err: Error, results?: T[]) => void): void;
    count(callback: (err: Error, result: number) => void): void;
    close(callback: (err: Error) => void): void;
}

export = Cursor;
