import Persister = require("../src/persister");
import ResultCallback = require("../src/core/resultCallback");
import InternalSession = require("../src/internalSession");
import PropertyFlags = require("../src/mapping/propertyFlags");
import Batch = require("../src/batch");
import ChangeTracking = require("../src/mapping/changeTracking");
import IdentityGenerator = require("../src/id/identityGenerator");
import EntityMapping = require("../src/mapping/entityMapping");
import Collection = require("../src/driver/collection");
import MockIdentityGenerator = require("./id/mockIdentityGenerator");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import model = require("./fixtures/model");
import Result = require("../src/core/result");
import Callback = require("../src/core/callback");
import QueryDefinition = require("../src/query/queryDefinition");

class MockPersister implements Persister {

    private _mapping: EntityMapping;

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    insertCalled = 0;
    inserted: any[] = [];

    dirtyCheckCalled = 0;
    dirtyChecked: any[] = [];

    removeCalled = 0;
    removed: any[] = [];

    executeQueryCalled = 0;

    constructor(mapping: EntityMapping) {
        this._mapping = mapping;
        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any> {
        this.dirtyCheckCalled++;
        if (!this.wasDirtyChecked(entity)) {
            this.dirtyChecked.push(entity);
        }

        return new Result(null, originalDocument);
    }

    wasDirtyChecked(entity: any): boolean {
        return this.dirtyChecked.indexOf(entity) !== -1;
    }

    addInsert(batch: Batch, entity: any): Result<any> {
        this.insertCalled++;
        if (!this.wasInserted(entity)) {
            this.inserted.push(entity);
        }
        return new Result(null, {});
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

    refresh(entity: any, callback: ResultCallback<any>): void {
    }

    fetch(entity: any, path: string, callback: Callback): void {
        if(this.onFetch) {
            process.nextTick(() => this.onFetch(entity, path, callback));
        }
    }

    onFetch: (entity: any, path: string, callback: Callback) => void;

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

    walk(entity: any, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {
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

export = MockPersister;