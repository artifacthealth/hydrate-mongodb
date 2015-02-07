import ResultCallback = require("../core/resultCallback");

interface FindOneQuery<T> {

    fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
}

export = FindOneQuery;