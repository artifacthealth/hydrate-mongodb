import {Callback} from "../core/callback";
import {ResultCallback} from "../core/callback";
import {IteratorCallback} from "../core/callback";
import {InternalSession} from "../session";
import {QueryDefinition} from "./queryDefinition";
import {QueryKind} from "./queryKind";
import {Constructor} from "../index"
import {PersistenceError} from "../persistenceError";
import {Observable} from "rx";
import {Cursor} from "../persister";

export interface QueryBuilder<T> {
    findAll(callback?: ResultCallback<T[]>): FindQuery<T>;
    findAll(criteria: QueryDocument, callback?: ResultCallback<T[]>): FindQuery<T>;
    findOne(callback?: ResultCallback<T>): FindOneQuery<T>;
    findOne(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneQuery<T>;
    findOneById(id: any, callback?: ResultCallback<T>): FindOneQuery<T>;
    findOneAndRemove(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    findOneAndUpsert(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    findOneAndUpsert(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    removeAll(callback?: ResultCallback<number>): void;
    removeAll(criteria: QueryDocument, callback?: ResultCallback<number>): void;
    removeOne(callback?: ResultCallback<number>): void;
    removeOne(criteria: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateAll(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    updateOne(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    upsert(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    upsert(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
    distinct(key: string, callback: ResultCallback<any[]>): void;
    distinct(key: string, criteria: QueryDocument, callback: ResultCallback<any[]>): void;
    count(callback?: ResultCallback<number>): CountQuery;
    count(criteria: QueryDocument, callback?: ResultCallback<number>): CountQuery;
}

export interface QueryDocument {

    [name: string]: any;
}

export interface Query<T> {

    /**
     * Executes the query if a callback was not passed to one of the other methods in the chain.
     */
    execute(callback: ResultCallback<any>): void;
    /**
     * Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) for the query.
     */
    asPromise(): Promise<T>;
}

export interface CountQuery extends Query<number> {

    limit(value: number, callback?: ResultCallback<number>): CountQuery;
    skip(value: number, callback?: ResultCallback<number>): CountQuery;
}

export interface FindOneAndRemoveQuery<T> extends Query<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    /**
     * Return a reference instead of the Entity for unmanaged Entities.
     */
    lazy(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
}

export interface FindOneAndUpdateQuery<T> extends Query<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    returnUpdated(callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    /**
     * Return a reference instead of the Entity for unmanaged Entities.
     */
    lazy(callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
}

export interface FindOneQuery<T> extends Query<T> {

    fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
    /**
     * Return a reference instead of the Entity for unmanaged Entities.
     */
    lazy(callback?: ResultCallback<T>): FindOneQuery<T>;
}

export interface FindQuery<T> extends Query<T[]> {

    sort(field: string, direction: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(path: string, callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T[]>): FindQuery<T>;
    limit(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    skip(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    /**
     * Return references instead of Entities for unmanaged Entities.
     */
    lazy(callback?: ResultCallback<T[]>): FindQuery<T>;
    batchSize(value: number): FindQuery<T>;
    each(iterator: IteratorCallback<T>, callback: Callback): void;
    eachSeries(iterator: IteratorCallback<T>, callback: Callback): void;

    /**
     * Returns an [Observable](http://reactivex.io/documentation/observable.html) for the query.
     */
    asObservable(): Observable<T>;
}


/**
 * @hidden
 */
export class QueryBuilderImpl<T> implements QueryBuilder<T> {

    private _session: InternalSession;
    private _entityCtr: Constructor<any> | string;

    constructor(session: InternalSession, entityCtr: Constructor<any> | string) {

        this._session = session;
        this._entityCtr = entityCtr;
    }

    findAll(callback?: ResultCallback<T[]>): FindQuery<T>;
    findAll(criteria: QueryDocument, callback?: ResultCallback<T[]>): FindQuery<T>;
    findAll(criteriaOrCallback?: any, callback?: ResultCallback<T[]>): FindQuery<T> {

        return this._createFindQuery(QueryKind.FindAll, criteriaOrCallback, callback);
    }

    findOne(callback?: ResultCallback<T>): FindOneQuery<T>;
    findOne(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneQuery<T>;
    findOne(criteriaOrCallback?: any, callback?: ResultCallback<T>): FindOneQuery<T> {

        return this._createFindQuery(QueryKind.FindOne, criteriaOrCallback, callback);
    }

    findOneById(id: any, callback?: ResultCallback<T>): FindOneQuery<T> {

        var query = this._createQuery(QueryKind.FindOneById);

        if(id == null) {
            query.error = new PersistenceError("Missing or invalid identifier.");
        }

        query.id = id;
        return query.handleCallback(callback);
    }

    findOneAndRemove(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    findOneAndRemove(criteriaOrCallback?: any, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T> {

        return this._createRemoveQuery(QueryKind.FindOneAndRemove, criteriaOrCallback, callback);
    }

    findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
    findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
    findOneAndUpdate(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>  {

        return this._createUpdateQuery(QueryKind.FindOneAndUpdate, criteriaOrUpdateDocument, updateDocumentOrCallback, callback);
    }

    findOneAndUpsert(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
    findOneAndUpsert(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
    findOneAndUpsert(criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>  {

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

    private _createUpdateQuery(kind: QueryKind, criteriaOrUpdateDocument: QueryDocument, updateDocumentOrCallback: any, callback?: ResultCallback<any>): any {

        var query = this._createQuery(kind);

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

    private _createRemoveQuery(kind: QueryKind, criteriaOrCallback?: any, callback?: ResultCallback<any>): any {

        var query = this._createQuery(kind);

        if(typeof criteriaOrCallback == "function") {
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

        return new QueryObject(this._session, this._entityCtr, kind);
    }
}

class QueryObject implements QueryDefinition, FindQuery<Object>, FindOneQuery<Object>, FindOneAndRemoveQuery<Object>, FindOneAndUpdateQuery<Object>, CountQuery {

    key: string;
    id: any;
    criteria: QueryDocument;
    fields: QueryDocument;
    updateDocument: QueryDocument;
    isLazy: boolean;
    wantsUpdated: boolean;
    fetchPaths: string[];
    sortValue: [string, number][];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<Object>;
    batchSizeValue: number;
    error: Error;

    private _session: InternalSession;
    private _entityCtr: Constructor<any> | string;
    private _executed: boolean;

    constructor(session: InternalSession, entityCtr: Constructor<any> | string, public kind: QueryKind) {

        this._session = session;
        this._entityCtr = entityCtr;
    }

    get readOnly(): boolean {
        switch (this.kind) {

            case QueryKind.FindAll:
            case QueryKind.FindEach:
            case QueryKind.FindEachSeries:
            case QueryKind.FindCursor:
            case QueryKind.FindOne:
            case QueryKind.FindOneById:
            case QueryKind.Distinct:
            case QueryKind.Count:
                return true;
            default:
                return false;
        }
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
                throw new PersistenceError("Expected second parameter to be the sort direction when first parameter is a string.");
            }
        }
        else {
            if(!Array.isArray(field)) {
                throw new PersistenceError("Expected first parameter to be a string or array");
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

    lazy(callback?: ResultCallback<any>): QueryObject {

        this.isLazy = true;
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
            throw new PersistenceError("Missing required argument 'iterator'.");
        }

        if(!callback) {
            throw new PersistenceError("Missing required argument 'callback'.");
        }

        this.kind = QueryKind.FindEach;
        this.iterator = iterator;
        this.handleCallback(callback);
    }

    eachSeries(iterator: IteratorCallback<Object>, callback: Callback): void {

        if(!iterator) {
            throw new PersistenceError("Missing required argument 'iterator'.");
        }

        if(!callback) {
            throw new PersistenceError("Missing required argument 'callback'.");
        }

        this.kind = QueryKind.FindEachSeries;
        this.iterator = iterator;
        this.handleCallback(callback);
    }

    handleCallback(callback: ResultCallback<any>): QueryObject {

        if(callback) {
            this.execute(callback);
        }

        return this;
    }

    execute(callback: ResultCallback<any>): void {

        if (this._executed) {
            callback(new PersistenceError("Query already executed. A callback can only be passed to one function in the chain."));
            return;
        }
        this._executed = true;

        if(this.error) {
            callback(this.error);
            return;
        }

        this._session.executeQuery(this, callback);
    }

    executeInternal(callback: ResultCallback<any>): void {

        var mapping = this._session.factory.getMappingForConstructor(this._entityCtr);
        if(!mapping) {
            callback(new PersistenceError("Object type is not mapped as an entity."));
            return;
        }

        this._session.getPersister(mapping).executeQuery(this, callback);
    }

    asPromise(): Promise<any> {
        // create and return the promise.
        return new Promise((resolve, reject) => {
            // wrapping of the classic callback handler.
            this.execute((err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }

    asObservable(): Observable<any> {

        this.kind = QueryKind.FindCursor;

        return Observable.create((observer) => {

            var cursor: Cursor<any>,
                disposed = false;

            this.execute((err: Error, result: Cursor<any>) => {
                if (err) {
                    observer.onError(err);
                }
                else {
                    cursor = result;

                    (function next() {

                        cursor.next((err: Error, entity: any) => {
                            if (disposed) {
                                cursor.close();
                                return;
                            }

                            if (err) {
                                observer.onError(err);
                                return;
                            }

                            if (entity == null) {
                                observer.onCompleted();
                                return;
                            }

                            observer.onNext(entity);
                            next();
                        });
                    })();
                }
            });

            // return the dispose function
            return () => {
                disposed = true;

                if (cursor) {
                    cursor.close();
                }
            }
        });
    }

    /**
     * Creates an object for logging purposes.
     */
    toObject(): Object {

        return {
            kind: QueryKind[this.kind],
            criteria: this.criteria,
            fields: this.fields,
            update: this.updateDocument,
            isLazy: this.isLazy,
            wantsUpdated: this.wantsUpdated,
            fetch: this.fetchPaths,
            sort: this.sortValue,
            limit: this.limitCount,
            skip: this.skipCount,
            batchSize: this.batchSizeValue
        };
    }
}
