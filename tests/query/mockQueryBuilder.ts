import {
    QueryBuilder, QueryDocument, FindQuery, FindOneQuery, FindOneAndRemoveQuery,
    FindOneAndUpdateQuery, CountQuery
} from "../../src/query/queryBuilder";
import {MockInternalSession} from "../mockInternalSession";
import {Constructor} from "../../src/index";
import {ResultCallback, IteratorCallback} from "../../src/core/callback";
import {QueryKind} from "../../src/query/queryKind";
export class MockQueryBuilder implements QueryBuilder<Object> {

    private _session: MockInternalSession;
    private _entityCtr: Constructor<any>;

    constructor(session: MockInternalSession, entityCtr: Constructor<any>) {

        this._session = session;
        this._entityCtr = entityCtr;
    }

    findAll(callback?: ResultCallback<Object[]>): FindQuery<Object>;
    findAll(criteria: QueryDocument, callback?: ResultCallback<Object[]>): FindQuery<Object>;
    findAll(criteriaOrCallback?: any, callback?: ResultCallback<Object[]>): FindQuery<Object> {

        return this._createFindQuery(QueryKind.FindAll, criteriaOrCallback, callback);
    }

    findOne(callback?: ResultCallback<Object>): FindOneQuery<Object>;
    findOne(criteria: QueryDocument, callback?: ResultCallback<Object>): FindOneQuery<Object>;
    findOne(criteriaOrCallback?: any, callback?: ResultCallback<Object>): FindOneQuery<Object> {

        return this._createFindQuery(QueryKind.FindOne, criteriaOrCallback, callback);
    }

    findOneById(id: any, callback?: ResultCallback<Object>): FindOneQuery<Object> {

        var query = this._createQuery(QueryKind.FindOneById);

        if (id == null) {
            query.error = new Error("Missing or invalid identifier.");
        }

        query.id = id;
        return query.handleCallback(callback);
    }

    findOneAndRemove(callback?: ResultCallback<Object>): FindOneAndRemoveQuery<Object>;
    findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<Object>): FindOneAndRemoveQuery<Object>;
    findOneAndRemove(criteriaOrCallback?: any, callback?: ResultCallback<Object>): FindOneAndRemoveQuery<Object> {

        return this._createRemoveQuery(QueryKind.FindOneAndRemove, criteriaOrCallback, callback);
    }

    findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object> ;
    findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument,
                     callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object> ;
    findOneAndUpdate(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any,
                     callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object>  {

        return this._createUpdateQuery(QueryKind.FindOneAndUpdate, criteriaOrUpdateDocument, updateDocumentOrCallback, callback);
    }

    findOneAndUpsert(updateDocument: QueryDocument, callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object> ;
    findOneAndUpsert(criteria: QueryDocument, updateDocument: QueryDocument,
                     callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object> ;
    findOneAndUpsert(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any,
                     callback?: ResultCallback<Object>): FindOneAndUpdateQuery<Object>  {

        return this._createUpdateQuery(QueryKind.FindOneAndUpsert, criteriaOrUpdateDocument, updateDocumentOrCallback, callback);
    }

    removeAll(callback?: ResultCallback<number>): void;
    removeAll(criteria: QueryDocument, callback?: ResultCallback<number>): void;
    removeAll(criteriaOrCallback?: any, callback?: ResultCallback<number>): void {

        this._createRemoveQuery(QueryKind.RemoveAll, criteriaOrCallback, callback);
    }

    removeOne(callback?: ResultCallback<number>): void;
    removeOne(criteria: QueryDocument, callback?: ResultCallback<number>): void;
    removeOne(criteriaOrCallback?: any, callback?: ResultCallback<number>): void {

        this._createRemoveQuery(QueryKind.RemoveOne, criteriaOrCallback, callback);
    }

    updateAll(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

        this._createUpdateQuery(QueryKind.UpdateAll, criteriaOrUpdateDocument, updateDocumentOrCallback, callback);
    }

    updateOne(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

        this._createUpdateQuery(QueryKind.UpdateOne, criteriaOrUpdateDocument, updateDocumentOrCallback, callback);
    }

    upsert(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    upsert(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    upsert(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<number>): void {

        this._createUpdateQuery(QueryKind.Upsert, criteriaOrUpdateDocument, updateDocumentOrCallback, callback);

    }

    distinct(key: string, callback: ResultCallback<any[]>): void;
    distinct(key: string, criteria: QueryDocument, callback: ResultCallback<any[]>): void;
    distinct(key: string, criteriaOrCallback: any, callback?: ResultCallback<any[]>): void {

        var query = this._createQuery(QueryKind.Distinct);
        query.key = key;
        if (typeof criteriaOrCallback === "function") {
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

        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        return query.handleCallback(callback);
    }

    private _createUpdateQuery(kind: QueryKind, criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any,
                               callback?: ResultCallback<Object>): any {

        var query = this._createQuery(kind);

        if (typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
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

    private _createRemoveQuery(kind: QueryKind, criteriaOrCallback?: any, callback?: ResultCallback<any>): any {

        var query = this._createQuery(kind);

        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        return query.handleCallback(callback);
    }

    private _createFindQuery(kind: QueryKind, criteriaOrCallback?: any, callback?: ResultCallback<any>): any {

        var query = this._createQuery(kind);

        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }

        return query.handleCallback(callback);
    }

    private _createQuery(kind: QueryKind): MockQueryObject {

        return new MockQueryObject(this._session, this._entityCtr, kind);
    }
}

export class MockQueryObject implements FindQuery<Object>, FindOneQuery<Object>, FindOneAndRemoveQuery<Object>,
    FindOneAndUpdateQuery<Object>, CountQuery {

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
    error: Error;
    entityCtr: Constructor<any>;

    private _session: MockInternalSession;
    private _executed: boolean;

    constructor(session: MockInternalSession, entityCtr: Constructor<any>, public kind: QueryKind) {

        this._session = session;
        this.entityCtr = entityCtr;
    }

    get readOnly(): boolean {
        switch (this.kind) {

            case QueryKind.FindAll:
            case QueryKind.FindEach:
            case QueryKind.FindEachSeries:
            case QueryKind.FindOne:
            case QueryKind.FindOneById:
            case QueryKind.Distinct:
            case QueryKind.Count:
                return true;
            default:
                return false;
        }
    }

    fetch(path: string | string[], callback?: ResultCallback<any>): MockQueryObject {

        if (!this.fetchPaths) {
            this.fetchPaths = [];
        }

        if (typeof path === "string") {
            this.fetchPaths.push(path);
        }
        else {
            this.fetchPaths = this.fetchPaths.concat(path);
        }

        return this.handleCallback(callback);
    }

    sort(field: string | [string, number][], directionOrCallback: number | ResultCallback<any>,
         callback?: ResultCallback<any>): MockQueryObject {

        if (!this.sortValue) {
            this.sortValue = [];
        }

        if (typeof field === "string" ) {
            if (typeof directionOrCallback === "number") {
                this.sortValue.push([field, directionOrCallback]);
            }
            else {
                throw new Error("Expected second parameter to be the sort direction when first parameter is a string.");
            }
        }
        else {
            if (!Array.isArray(field)) {
                throw new Error("Expected first parameter to be a string or array");
            }
            this.sortValue = this.sortValue.concat(field);
        }

        if (typeof directionOrCallback === "number") {
            return this.handleCallback(callback);
        }
        else {
            return this.handleCallback(directionOrCallback);
        }
    }

    returnUpdated(callback?: ResultCallback<any>): MockQueryObject {

        this.wantsUpdated = true;
        return this.handleCallback(callback);
    }

    limit(value: number, callback?: ResultCallback<any>): MockQueryObject {

        this.limitCount = value;
        return this.handleCallback(callback);
    }

    skip(value: number, callback?: ResultCallback<any>): MockQueryObject {

        this.skipCount = value;
        return this.handleCallback(callback);
    }

    batchSize(value: number, callback?: ResultCallback<any>): MockQueryObject {
        this.batchSizeValue = value;
        return this.handleCallback(callback);
    }

    each(iterator: IteratorCallback<Object>, callback: Callback): void {

        if (!iterator) {
            throw new Error("Missing required argument 'iterator'.");
        }

        if (!callback) {
            throw new Error("Missing required argument 'callback'.");
        }

        this.kind = QueryKind.FindEach;
        this.iterator = iterator;
        this.handleCallback(callback);
    }

    eachSeries(iterator: IteratorCallback<Object>, callback: Callback): void {

        if (!iterator) {
            throw new Error("Missing required argument 'iterator'.");
        }

        if (!callback) {
            throw new Error("Missing required argument 'callback'.");
        }

        this.kind = QueryKind.FindEachSeries;
        this.iterator = iterator;
        this.handleCallback(callback);
    }

    handleCallback(callback: ResultCallback<any>): MockQueryObject {

        if (callback) {
            if (this._executed) {
                callback(new Error("Query already executed. A callback can only be passed to one function in the chain."));
            }
            else {
                this._executed = true;

                if (this.error) {
                    process.nextTick(() => callback(this.error));
                }
                else {
                    this._session.executeQuery(<any>this, callback);
                }
            }
        }

        return this;
    }

    execute(callback: ResultCallback<any>): void {

        this._session.executeQuery(<any>this, callback);
    }

    asPromise(): Promise<any> {
        // create and return the promise.
        return new Promise((resolve, reject) => {
            // wrapping of the classic callback handler.
            this.handleCallback((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
}
