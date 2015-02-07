import Callback = require("../core/callback");
import ResultCallback = require("../core/resultCallback");
import IteratorCallback = require("../core/iteratorCallback");

import InternalSession = require("../internalSession");
import Persister = require("../persister");
import QueryDefinition = require("./queryDefinition");
import QueryKind = require("./queryKind");

import FindOneAndRemoveQuery = require("./findOneAndRemoveQuery");
import FindOneAndUpdateQuery = require("./findOneAndUpdateQuery");
import FindOneQuery = require("./findOneQuery");
import FindQuery = require("./findQuery");
import CountQuery = require("./countQuery");

class Query<T> {

    private _session: InternalSession;
    private _persister: Persister;

    constructor(session: InternalSession, persister: Persister) {

        this._session = session;
        this._persister = persister;
    }

    findAll(criteria: Object, callback?: ResultCallback<T[]>): FindQuery<T> {

        var query = this._createQuery(QueryKind.FindAll);
        query.criteria = criteria;
        return query.handleCallback(callback);
    }

    findOne(criteria: Object, callback?: ResultCallback<T>): FindOneQuery<T> {

        var query = this._createQuery(QueryKind.FindOne);
        query.criteria = criteria;
        return query.handleCallback(callback);
    }

    findOneById(id: any, callback?: ResultCallback<any>): FindOneQuery<T> {

        if(typeof id === "string") {
            id = this._persister.identity.fromString(id);
        }

        var query = this._createQuery(QueryKind.FindOneById);
        query.criteria = id;
        return query.handleCallback(callback);
    }

    findOneAndRemove(criteria: Object, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T> {

        var query = this._createQuery(QueryKind.FindOneAndRemove);
        query.criteria = criteria;
        return query.handleCallback(callback);
    }

    findOneAndUpdate(criteria: Object, updateDocument: Object, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> {

        var query = this._createQuery(QueryKind.FindOneAndUpdate);
        query.criteria = criteria;
        query.updateDocument = updateDocument;
        return query.handleCallback(callback);
    }

    removeAll(criteria: Object, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.RemoveAll);
        query.criteria = criteria;
        query.handleCallback(callback);
    }

    removeOne(criteria: Object, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.RemoveOne);
        query.criteria = criteria;
        query.handleCallback(callback);
    }

    updateAll(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.UpdateAll);
        query.criteria = criteria;
        query.updateDocument = updateDocument;
        query.handleCallback(callback);
    }

    updateOne(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.UpdateOne);
        query.criteria = criteria;
        query.updateDocument = updateDocument;
        query.handleCallback(callback);
    }

    distinct(key: string, criteria: Object, callback: ResultCallback<T[]>): void {

        var query = this._createQuery(QueryKind.UpdateOne);
        query.key = key;
        query.criteria = criteria;
        query.handleCallback(callback);
    }

    count(criteria: Object, callback?: ResultCallback<number>): CountQuery {

        var query = this._createQuery(QueryKind.Count);
        query.criteria = criteria;
        return query.handleCallback(callback);
    }

    private _createQuery(kind: QueryKind): QueryObject {

        return new QueryObject(this._session, this._persister, kind);
    }
}

class QueryObject implements QueryDefinition, FindQuery<any>, FindOneQuery<any>, FindOneAndRemoveQuery<any>, FindOneAndUpdateQuery<any>, CountQuery {

    key: string;
    criteria: any;
    updateDocument: any;

    wantsUpdated: boolean;
    fetchPaths: string[];
    sortBy: [string, number][];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<any>;

    private _session: InternalSession;
    private _persister: Persister;
    private _executed: boolean;

    constructor(session: InternalSession, persister: Persister, public kind: QueryKind) {

        this._session = session;
        this._persister = persister;
    }

    get readOnly(): boolean {
        return (this.kind & QueryKind.ReadOnly) !== 0;
    }

    fetch(path: string | string[], callback?: ResultCallback<any>): QueryObject {

        if(!this.fetchPaths) {
            this.fetchPaths = [];
        }

        if(typeof path === "string") {
            this.fetchPaths.push(path);
        }
        else {
            this.fetchPaths = this.fetchPaths.concat(path);
        }

        return this.handleCallback(callback);
    }

    sort(field: string | [string, number][], directionOrCallback: number | ResultCallback<any>, callback?: ResultCallback<any>): QueryObject {

        if(!this.sortBy) {
            this.sortBy = [];
        }

        if(typeof field === "string" ) {
            if(typeof directionOrCallback === "number") {
                this.sortBy.push([field, directionOrCallback]);
            }
            else {
                throw new Error("Expected second parameter to be the sort direction when first parameter is a string.");
            }
        }
        else {
            this.sortBy = this.sortBy.concat(field);
        }

        if(typeof directionOrCallback === "number") {
            return this.handleCallback(callback);
        }
        else {
            return this.handleCallback(directionOrCallback);
        }
    }

    returnUpdated(callback?: ResultCallback<any>): QueryObject {

        this.wantsUpdated = true;
        return this.handleCallback(callback);
    }

    limit(value: number, callback?: ResultCallback<any>): QueryObject {

        this.limitCount = value;
        return this.handleCallback(callback);
    }

    skip(value: number, callback?: ResultCallback<any>): QueryObject {

        this.skipCount = value;
        return this.handleCallback(callback);
    }

    each(iterator: IteratorCallback<any>, callback: Callback): void {

        if(!iterator) {
            throw new Error("Missing required argument 'iterator'.");
        }

        if(!callback) {
            throw new Error("Missing required argument 'callback'.");
        }

        this.kind = QueryKind.FindEach;
        this.iterator = iterator;
        this.handleCallback(callback);
    }

    eachSeries(iterator: IteratorCallback<any>, callback: Callback): void {

        if(!iterator) {
            throw new Error("Missing required argument 'iterator'.");
        }

        if(!callback) {
            throw new Error("Missing required argument 'callback'.");
        }

        this.kind = QueryKind.FindEachSeries;
        this.iterator = iterator;
        this.handleCallback(callback);
    }

    handleCallback(callback: ResultCallback<any>): QueryObject {

        if(callback) {
            if(this._executed) {
                callback(new Error("Query already executed. A callback can only be passed to one function in the chain."));
            }
            else {
                this._session.executeQuery(this, callback);
                this._executed = true;
            }
        }

        return this;
    }

    execute(callback: ResultCallback<any>): void {

        this._persister.executeQuery(this, callback);
    }
}

export = Query;


