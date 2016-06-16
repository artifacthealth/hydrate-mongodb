import {Callback} from "../core/callback";
import {ResultCallback} from "../core/callback";
import {IteratorCallback} from "../core/callback";

import {InternalSession} from "../session";
import {Persister} from "../persister";
import {QueryDefinition} from "./queryDefinition";
import {QueryKind} from "./queryKind";

import {Constructor} from "../index"
import {PersistenceError} from "../persistenceError";

export interface QueryBuilder<T> {
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

export interface QueryDocument {

    [name: string]: any;
}

export interface Query<T> {

    execute(callback: ResultCallback<T>): void;
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
}

export interface FindOneAndUpdateQuery<T> extends Query<T> {

    sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    fetch(path: string, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    returnUpdated(callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
}

export interface FindOneQuery<T> extends Query<T> {

    fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
}

export interface FindQuery<T> extends Query<T[]> {

    sort(field: string, direction: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(path: string, callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T[]>): FindQuery<T>;
    limit(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    skip(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    batchSize(value: number): FindQuery<T>;
    each(iterator: IteratorCallback<T>, callback: Callback): void;
    eachSeries(iterator: IteratorCallback<T>, callback: Callback): void;
}


/**
 * @hidden
 */
export class QueryBuilderImpl implements QueryBuilder<Object> {

    private _session: InternalSession;
    private _entityCtr: Constructor<any>;

    constructor(session: InternalSession, entityCtr: Constructor<any>) {

        this._session = session;
        this._entityCtr = entityCtr;
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

        var query = this._createQuery(QueryKind.FindOneById);

        if(id == null) {
            query.error = new PersistenceError("Missing or invalid identifier.");
        }

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

        return new QueryObject(this._session, this._entityCtr, kind);
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
    error: Error;

    private _session: InternalSession;
    private _entityCtr: Constructor<any>;
    private _executed: boolean;

    constructor(session: InternalSession, entityCtr: Constructor<any>, public kind: QueryKind) {

        this._session = session;
        this._entityCtr = entityCtr;
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
            if(this._executed) {
                callback(new PersistenceError("Query already executed. A callback can only be passed to one function in the chain."));
            }
            else {
                this._executed = true;

                if(this.error) {
                    process.nextTick(() => callback(this.error))
                }
                else {
                    this._session.executeQuery(this, callback);
                }
            }
        }

        return this;
    }

    execute(callback: ResultCallback<any>): void {

        var mapping = this._session.factory.getMappingForConstructor(this._entityCtr);
        if(!mapping) {
            callback(new PersistenceError("Object type is not mapped as an entity."));
            return;
        }

        this._session.getPersister(mapping).executeQuery(this, callback);
    }
}
