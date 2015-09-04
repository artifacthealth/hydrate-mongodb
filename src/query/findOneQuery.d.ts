import ResultCallback = require("../core/resultCallback");
import Query = require("./query");

interface FindOneQuery<T> extends Query<T> {

    fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
}

export = FindOneQuery;