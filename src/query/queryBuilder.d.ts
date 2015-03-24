import FindOneAndRemoveQuery = require("./findOneAndRemoveQuery");
import FindOneAndUpdateQuery = require("./findOneAndUpdateQuery");
import FindOneQuery = require("./findOneQuery");
import FindQuery = require("./findQuery");
import CountQuery = require("./countQuery");
import QueryDocument = require("./queryDocument");
import ResultCallback = require("../core/resultCallback");

interface QueryBuilder<T> {
    findAll(callback?: ResultCallback<T[]>): FindQuery<T>;
    findAll(criteria: QueryDocument, callback?: ResultCallback<T[]>): FindQuery<T>;
    findOne(callback?: ResultCallback<T>): FindOneQuery<T>;
    findOne(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneQuery<T>;
    findOneById(id: any, callback?: ResultCallback<Object>): FindOneQuery<T>;
    findOneAndRemove(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    removeAll(callback?: ResultCallback<number>): void;
    removeAll(criteria: QueryDocument, callback?: ResultCallback<number>): void;
    removeOne(callback?: ResultCallback<number>): void;
    removeOne(criteria: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    distinct(key: string, callback: ResultCallback<any[]>): void;
    distinct(key: string, criteria: QueryDocument, callback: ResultCallback<any[]>): void;
    count(callback?: ResultCallback<number>): CountQuery;
    count(criteria: QueryDocument, callback?: ResultCallback<number>): CountQuery;
}

export = QueryBuilder;