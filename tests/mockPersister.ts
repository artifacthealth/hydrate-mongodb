import {DirtyCheckContext, Persister} from "../src/persister";
import {ResultCallback} from "../src/core/callback";
import {MappingModel} from "../src/mapping/mappingModel";
import {Batch} from "../src/batch";
import {ChangeTrackingType} from "../src/mapping/mappingModel";
import {IdentityGenerator} from "../src/config/configuration";
import {EntityMapping} from "../src/mapping/entityMapping";
import {Callback} from "../src/core/callback";
import {QueryDefinition} from "../src/query/queryDefinition";
import {Observer} from "../src/observer";
import {Property} from "../src/mapping/property";
import {InternalSession} from "../src/session";

export class MockPersister implements Persister {

    private _mapping: EntityMapping;
    private _session: InternalSession;

    changeTracking: ChangeTrackingType;
    identity: IdentityGenerator;

    insertCalled = 0;
    inserted: any[] = [];
    insertError: Error;

    dirtyCheckCalled = 0;
    dirtyChecked: any[] = [];

    removeCalled = 0;
    removed: any[] = [];

    executeQueryCalled = 0;

    constructor(session: InternalSession, mapping: EntityMapping) {
        this._mapping = mapping;
        this._session = session;
        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    areDocumentsEqual(context: DirtyCheckContext, entity: Object, originalDocument: Object): boolean {

        if (this.onAreDocumentsEqual) {
            return this.onAreDocumentsEqual(context, entity, originalDocument);
        }
        return true;
    }

    onAreDocumentsEqual: (context: DirtyCheckContext, entity: Object, originalDocument: Object) => boolean;

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Object {
        this.dirtyCheckCalled++;
        if (!this.wasDirtyChecked(entity)) {
            this.dirtyChecked.push(entity);
        }

        return originalDocument;
    }

    wasDirtyChecked(entity: any): boolean {
        return this.dirtyChecked.indexOf(entity) !== -1;
    }

    addInsert(batch: Batch, entity: any): Object {

        if (this.insertError) {
            batch.error = this.insertError;
            return null;
        }
        this.insertCalled++;
        if (!this.wasInserted(entity)) {
            this.inserted.push(entity);
        }
        return {};
    }

    writeHistory(batch: Batch, entity: Object, version: number, originalDocument?: Object): void {

    }

    wasInserted(entity: any): boolean {
        return this.inserted.indexOf(entity) !== -1;
    }

    addRemove(batch: Batch, entity: any): void {
        this.removeCalled++;
        if (!this.wasRemoved(entity)) {
            this.removed.push(entity);
        }
    }

    wasRemoved(entity: any): boolean {
        return this.removed.indexOf(entity) !== -1;
    }

    postUpdate(entity: Object, callback: Callback): void {

        callback();
    }

    postInsert(entity: Object, callback: Callback): void {

        callback();
    }

    postRemove(entity: Object, callback: Callback): void {

        callback();
    }

    refresh(entity: any, callback: ResultCallback<any>): void {
        if(this.onRefresh) {
            process.nextTick(() => this.onRefresh(entity, callback));
        }
    }

    onRefresh: (entity: any, callback: Callback) => void;

    watch(value: any, observer: Observer): void {

        this._mapping.watchEntity(value, observer);
    }

    fetch(entity: any, path: string, callback: Callback): void {
        if(this.onFetch) {
            process.nextTick(() => this.onFetch(entity, path, callback));
        }
        else {
            this._mapping.fetch(this._session, undefined, entity, path.split("."), 0, callback);
        }
    }

    onFetch: (entity: any, path: string, callback: Callback) => void;

    fetchPropertyValue(entity: any, property: Property, callback: ResultCallback<any>): void {

        if(this.onFetchPropertyValue) {
            process.nextTick(() => this.onFetchPropertyValue(entity, property, callback));
        }
    }

    onFetchPropertyValue: (entity: any, property: Property, callback: ResultCallback<any>) => void;

    findAll(criteria: any, callback?: ResultCallback<any[]>): void {
    }

    findOneById(id: any, callback: ResultCallback<any>): void {
        if(this.onFindOneById) {
            process.nextTick(() => this.onFindOneById(id, callback));
        }
    }

    onFindOneById: (id: any, callback: ResultCallback<any>) => void;

    findOne(criteria: any, callback: ResultCallback<any>): void {

    }

    findInverseOf(entity: Object, path: string, callback: ResultCallback<any[]>): void {

    }

    findOneInverseOf(entity: Object, path: string, callback: ResultCallback<any>): void {

    }

    walk(entity: any, flags: MappingModel.PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {
        if(entities.indexOf(entity) == -1) {
            entities.push(entity);
        }
        process.nextTick(() => callback(null));
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<Object>): void {
        this.executeQueryCalled++;
        if(this.onExecuteQuery) {
            process.nextTick(() => this.onExecuteQuery(query, callback));
        }
        else {
            process.nextTick(() => callback(null));
        }
    }

    onExecuteQuery: (query: QueryDefinition, callback: ResultCallback<any>) => void;
}
