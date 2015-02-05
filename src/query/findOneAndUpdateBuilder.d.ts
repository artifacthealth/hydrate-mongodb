import ResultCallback = require("../core/resultCallback");

interface FindOneAndUpdateBuilder<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndUpdateBuilder<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndUpdateBuilder<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndUpdateBuilder<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndUpdateBuilder<T>;
    returnUpdated(callback?: ResultCallback<T>): FindOneAndUpdateBuilder<T>;
}

export = FindOneAndUpdateBuilder;