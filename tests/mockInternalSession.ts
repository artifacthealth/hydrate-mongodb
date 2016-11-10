import {EventEmitter} from "events";
import {InternalSession} from "../src/session";
import {SessionFactory, InternalSessionFactory} from "../src/sessionFactory";
import {MockQueryObject, MockQueryBuilder} from "./query/mockQueryBuilder";
import {ResultCallback} from "../src/core/callback";
import {generateId} from "./helpers";
import {Constructor, getIdentifier} from "../src/index";
import {FindOneQuery, QueryBuilder} from "../src/query/queryBuilder";
import {Persister} from "../src/persister";
import {EntityMapping} from "../src/mapping/entityMapping";
import {QueryDefinition} from "../src/query/queryDefinition";
import {Property} from "../src/mapping/property";

export class MockInternalSession extends EventEmitter implements InternalSession {

    factory: InternalSessionFactory;
    executeQueryCalled = 0;
    onExecuteQuery: (query: MockQueryObject, callback: ResultCallback<any>) => void;
    saved: any[] = [];
    fetches: FetchDescription[] = [];

    private _collection: any[] = [];

    constructor(factory: InternalSessionFactory) {
        super();

        this.factory = factory;
    }

    add(item: any): void {

        if (!this.contains(item)) {
            this._collection.push(item);
        }
    }

    save(obj: Object, callback?: Callback): void {

        this.saved.push(obj);
        if (!(<any>obj)._id) {
            (<any>obj)._id = generateId();
        }
        this.add(obj);

        if (callback) {
            process.nextTick(callback);
        }
    }

    remove(obj: Object, callback?: Callback): void {
        if (callback) {
            process.nextTick(callback);
        }
    }

    detach(obj: Object, callback?: Callback): void {
        if (callback) {
            process.nextTick(callback);
        }
    }

    refresh(obj: Object, callback: Callback): void {
        process.nextTick(callback);
    }

    flush(callback?: Callback): void {
        if (callback) {
            process.nextTick(callback);
        }
    }

    clear(callback?: Callback): void {
        if (callback) {
            process.nextTick(callback);
        }
    }

    find<T>(ctr: Constructor<T>, id: any, callback?: ResultCallback<T>): FindOneQuery<T> {

        if (id) {
            var entity = this._find(id);
            if (entity) {
                process.nextTick(() => {
                    callback(null, entity);
                });
                return;
            }
        }

        return this.query(ctr).findOneById(id, callback);
    }

    getReference<T>(ctr: Constructor<T>, id: any): T {

        var entity = this._find(id);
        if (entity) {
            return entity;
        }
        throw new Error("Not implemented");
    }

    fetch<T>(obj: T, pathsOrCallback: any, callback?: ResultCallback<T>): void {

        var paths: string[];

        if (typeof pathsOrCallback === "function") {
            callback = pathsOrCallback;
        }
        else if (typeof pathsOrCallback === "string") {
            paths = [pathsOrCallback];
        }
        else {
            paths = pathsOrCallback;
        }

        this.fetches.push({ obj, paths });
        process.nextTick(() => callback(null, obj));
    }

    query<T>(ctr: Constructor<T>): QueryBuilder<T> {

        return new MockQueryBuilder(this, ctr);
    }

    wait(callback?: Callback): void {
        if (callback) {
            process.nextTick(callback);
        }
    }

    close(callback?: Callback): void {
        if (callback) {
            process.nextTick(callback);
        }
    }

    contains(obj: Object): boolean {

        for (let i = 0; i < this._collection.length; i++) {
            if (this._collection[i] == obj) {
                return true;
            }
        }

        return false;
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void {
        this.executeQueryCalled++;
        if (this.onExecuteQuery) {
            process.nextTick(() => this.onExecuteQuery(<any>query, callback));
        }
        else {

            process.nextTick(() => callback(null));
        }
    }

    toDocument(obj: Object, callback?: ResultCallback<Object>): Object {
        return undefined;
    }

    getVersion(obj: Object): number {
        return undefined;
    }

    getObject(id: any): any {
        return undefined;
    }

    registerManaged(persister: Persister, entity: Object, document: any): void {
    }

    notifyRemoved(entity: Object): void {
    }

    getPersister(mapping: EntityMapping): Persister {
        return undefined;
    }

    getReferenceInternal(mapping: EntityMapping, id: any): any {
        return undefined;
    }

    fetchInternal(entity: Object, paths: string[], callback: ResultCallback<any>): void {

        this.fetch(entity, paths, callback);
    }

    findFetchedPaths(obj: any): string[] {

        for (var i = 0; i < this.fetches.length; i++) {
            var fetch = this.fetches[i];

            if (fetch.obj == obj) {
                return fetch.paths;
            }
        }

        return null;
    }

    private _find(id: string): any {

        for (let i = 0; i < this._collection.length; i++) {
            let item = this._collection[i];

            if (getIdentifier(item) === id) {
                return item;
            }
        }

        return null;
    }
}

export interface FetchDescription {

    obj: any;
    paths: string[];
}
