import ResultCallback = require("../core/resultCallback");

interface FindOneBuilder<T> {

    fetch(path: string, callback?: ResultCallback<T>): FindOneBuilder<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneBuilder<T>;
}

export = FindOneBuilder;