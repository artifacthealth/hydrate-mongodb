import ResultCallback = require("../core/resultCallback");

interface FindOneAndRemoveBuilder<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndRemoveBuilder<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndRemoveBuilder<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndRemoveBuilder<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndRemoveBuilder<T>;
}

export = FindOneAndRemoveBuilder;