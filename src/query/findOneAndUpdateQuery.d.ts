import ResultCallback = require("../core/resultCallback");
import Query = require("./query");

interface FindOneAndUpdateQuery<T> extends Query<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    returnUpdated(callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
}

export = FindOneAndUpdateQuery;