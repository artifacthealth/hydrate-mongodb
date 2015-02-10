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

    findAll(callback?: ResultCallback<T[]>): FindQuery<T>;
    findAll(criteria: Object, callback?: ResultCallback<T[]>): FindQuery<T>;
    findAll(criteriaOrCallback?: any, callback?: ResultCallback<T[]>): FindQuery<T> {

        var query = this._createQuery(QueryKind.FindAll);

        if(typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        return query.handleCallback(callback);
    }

    findOne(callback?: ResultCallback<T>): FindOneQuery<T>;
    findOne(criteria: Object, callback?: ResultCallback<T>): FindOneQuery<T>;
    findOne(criteriaOrCallback?: any, callback?: ResultCallback<T>): FindOneQuery<T> {

        var query = this._createQuery(QueryKind.FindOne);

        if(typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

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

    findOneAndRemove(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndRemove(criteria: Object, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndRemove(criteriaOrCallback?: any, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T> {

        var query = this._createQuery(QueryKind.FindOneAndRemove);

        if(typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        return query.handleCallback(callback);
    }

    findOneAndUpdate(updateDocument: Object, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
    findOneAndUpdate(criteria: Object, updateDocument: Object, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
    findOneAndUpdate(criteriaOrUpdateDocument: Object, updateDocumentOrCallback: any, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>  {

        var query = this._createQuery(QueryKind.FindOneAndUpdate);

        if(typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
            callback = updateDocumentOrCallback;
            query.updateDocument = criteriaOrUpdateDocument;
            query.criteria = {};
        }
        else {
            query.updateDocument = updateDocumentOrCallback;
            query.criteria = criteriaOrUpdateDocument;
        }

        return query.handleCallback(callback);
    }

    removeAll(callback?: ResultCallback<number>): void;
    removeAll(criteria: Object, callback?: ResultCallback<number>): void;
    removeAll(criteriaOrCallback?: any, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.RemoveAll);

        if(typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        query.handleCallback(callback);
    }

    removeOne(callback?: ResultCallback<number>): void;
    removeOne(criteria: Object, callback?: ResultCallback<number>): void;
    removeOne(criteriaOrCallback?: any, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.RemoveOne);

        if(typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        query.handleCallback(callback);
    }

    updateAll(updateDocument: Object, callback?: ResultCallback<number>): void;
    updateAll(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void;
    updateAll(criteriaOrUpdateDocument: Object, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.UpdateAll);

        if(typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
            callback = updateDocumentOrCallback;
            query.updateDocument = criteriaOrUpdateDocument;
            query.criteria = {};
        }
        else {
            query.updateDocument = updateDocumentOrCallback;
            query.criteria = criteriaOrUpdateDocument;
        }

        query.handleCallback(callback);
    }

    updateOne(updateDocument: Object, callback?: ResultCallback<number>): void;
    updateOne(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void;
    updateOne(criteriaOrUpdateDocument: Object, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

        var query = this._createQuery(QueryKind.UpdateOne);

        if(typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
            callback = updateDocumentOrCallback;
            query.updateDocument = criteriaOrUpdateDocument;
            query.criteria = {};
        }
        else {
            query.updateDocument = updateDocumentOrCallback;
            query.criteria = criteriaOrUpdateDocument;
        }

        query.handleCallback(callback);
    }

    distinct(key: string, callback: ResultCallback<any[]>): void;
    distinct(key: string, criteria: Object, callback: ResultCallback<any[]>): void;
    distinct(key: string, criteriaOrCallback: any, callback?: ResultCallback<any[]>): void {

        var query = this._createQuery(QueryKind.Distinct);
        query.key = key;
        if(typeof criteriaOrCallback === "function") {
            query.criteria = {};
            callback = criteriaOrCallback;
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        query.handleCallback(callback);
    }

    count(callback?: ResultCallback<number>): CountQuery;
    count(criteria: Object, callback?: ResultCallback<number>): CountQuery;
    count(criteriaOrCallback?: any, callback?: ResultCallback<number>): CountQuery {

        var query = this._createQuery(QueryKind.Count);

        if(typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        return query.handleCallback(callback);
    }

    private _createQuery(kind: QueryKind): QueryObject {

        return new QueryObject(this._session, this._persister, kind);
    }
}

class QueryObject implements QueryDefinition, FindQuery<Object>, FindOneQuery<Object>, FindOneAndRemoveQuery<Object>, FindOneAndUpdateQuery<Object>, CountQuery {

    key: string;
    criteria: Object;
    updateDocument: Object;

    wantsUpdated: boolean;
    fetchPaths: string[];
    sortBy: [string, number][];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<Object>;
    batchSizeValue: number;

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

    batchSize(value: number, callback?: ResultCallback<any>): QueryObject {
        this.batchSizeValue = value;
        return this.handleCallback(callback);
    }

    each(iterator: IteratorCallback<Object>, callback: Callback): void {

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

    eachSeries(iterator: IteratorCallback<Object>, callback: Callback): void {

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

    handleCallback(callback: ResultCallback<Object>): QueryObject {

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

    execute(callback: ResultCallback<Object>): void {

        this._persister.executeQuery(this, callback);
    }
}

export = Query;


