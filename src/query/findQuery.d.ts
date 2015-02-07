import ResultCallback = require("../core/resultCallback");
import Callback = require("../core/callback");
import IteratorCallback = require("../core/iteratorCallback");

interface FindQuery<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(path: string, callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T[]>): FindQuery<T>;
    limit(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    skip(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    each(iterator: IteratorCallback<T>, callback: Callback): void;
    eachSeries(iterator: IteratorCallback<T>, callback: Callback): void;
}

export = FindQuery;