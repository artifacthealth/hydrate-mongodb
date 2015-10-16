import Callback = require("../core/callback");
import ResultCallback = require("../core/resultCallback");
import IteratorCallback = require("../core/iteratorCallback");

import InternalSession = require("../internalSession");
import Persister = require("../persister");
import QueryDefinition = require("./queryDefinition");
import QueryKind = require("./queryKind");

import QueryBuilder = require("./queryBuilder");
import FindOneAndRemoveQuery = require("./findOneAndRemoveQuery");
import FindOneAndUpdateQuery = require("./findOneAndUpdateQuery");
import FindOneQuery = require("./findOneQuery");
import FindQuery = require("./findQuery");
import CountQuery = require("./countQuery");
import QueryDocument = require("./queryDocument");

class QueryBuilderImpl implements QueryBuilder<Object> {

    private _session: InternalSession;
    private _persister: Persister;

    constructor(session: InternalSession, persister: Persister) {

        this._session = session;
        this._persister = persister;
    }

    findAll(callback?: ResultCallback<Object[]>): FindQuery<Object>;
    findAll(criteria: QueryDocument, callback?: ResultCallback<Object[]>): FindQuery<Object>;
    findAll(criteriaOrCallback?: any, callback?: ResultCallback<Object[]>): FindQuery<Object> {

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

    findOne(callback?: ResultCallback<Object>): FindOneQuery<Object>;
    findOne(criteria: QueryDocument, callback?: ResultCallback<Object>): FindOneQuery<Object>;
    findOne(criteriaOrCallback?: any, callback?: ResultCallback<Object>): FindOneQuery<Object> {

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

    findOneById(id: any, callback?: ResultCallback<Object>): FindOneQuery<Object> {

        if(typeof id === "string") {
            id = this._persister.identity.fromString(id);
        }
        if(id == null) {
            callback(new Error("Missing or invalid identifier."));
            return;
        }

        var query = this._createQuery(QueryKind.FindOneById);
        query.id = id;
        return query.handleCallback(callback);
    }

    findOneAndRemove(callback?: ResultCallback<Object>): FindOneAndRemoveQuery<Object>;
    findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<Object>): FindOneAndRemoveQuery<Object>;
    findOneAndRemove(criteriaOrCallback?: any, callback?: ResultCallback<Object>): FindOneAndRemoveQuery<Object> {

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

    findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object> ;
    findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object> ;
    findOneAndUpdate(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object>  {

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
    removeAll(criteria: QueryDocument, callback?: ResultCallback<number>): void;
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
    removeOne(criteria: QueryDocument, callback?: ResultCallback<number>): void;
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

    updateAll(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

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

    updateOne(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

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
    distinct(key: string, criteria: QueryDocument, callback: ResultCallback<any[]>): void;
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
    count(criteria: QueryDocument, callback?: ResultCallback<number>): CountQuery;
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
    id: any;
    criteria: QueryDocument;
    updateDocument: QueryDocument;

    wantsUpdated: boolean;
    fetchPaths: string[];
    sortValue: [string, number][];
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

        if(!this.sortValue) {
            this.sortValue = [];
        }

        if(typeof field === "string" ) {
            if(typeof directionOrCallback === "number") {
                this.sortValue.push([field, directionOrCallback]);
            }
            else {
                throw new Error("Expected second parameter to be the sort direction when first parameter is a string.");
            }
        }
        else {
            if(!Array.isArray(field)) {
                throw new Error("Expected first parameter to be a string or array");
            }
            this.sortValue = this.sortValue.concat(field);
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

export = QueryBuilderImpl;


