import ResultCallback = require("../core/resultCallback");

interface FindOneAndRemoveQuery<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
}

export = FindOneAndRemoveQuery;