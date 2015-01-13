import Persister = require("../src/persister");
import Identifier = require('../src/id/identifier');
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
import Cursor = require("../src/cursor");

class MockPersister implements Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;
    mapping: EntityMapping;
    collection: Collection;

    insertCalled = 0;
    inserted: any[] = [];

    dirtyCheckCalled = 0;
    dirtyChecked: any[] = [];

    removeCalled = 0;
    removed: any[] = [];

    private _registry: MappingRegistry;

    constructor() {
        this._registry = new MappingRegistry();
        var mapping = new EntityMapping(this._registry);
        mapping.identity = new MockIdentityGenerator();
        mapping.classConstructor = model.Address;
        this._registry.addMapping(mapping);
        this.mapping = mapping;
        this.identity = mapping.identity;
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

    insert(batch: Batch, entity: any): Result<any> {
        this.insertCalled++;
        if (!this.wasInserted(entity)) {
            this.inserted.push(entity);
        }
        return new Result(null, {});
    }

    wasInserted(entity: any): boolean {
        return this.inserted.indexOf(entity) !== -1;
    }

    remove(batch: Batch, entity: any): void {
        this.removeCalled++;
        if (!this.wasRemoved(entity)) {
            this.removed.push(entity);
        }
    }

    wasRemoved(entity: any): boolean {
        return this.removed.indexOf(entity) !== -1;
    }

    refresh(session: InternalSession, entity: any, callback: ResultCallback<any>): void {
    }

    find(session: InternalSession, criteria: any): Cursor {
        return null;
    }

    findOneById(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void {

    }

    findOne(session: InternalSession, criteria: any, callback: ResultCallback<any>): void {

    }

    getReferencedEntities(session: InternalSession, entity: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {
        process.nextTick(() => callback(null, [entity]));
    }
}

export = MockPersister;