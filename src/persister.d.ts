/// <reference path="../typings/async.d.ts" />

import Identifier = require('./id/identifier');
import Table = require("./core/table");
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import PropertyFlags = require("./mapping/propertyFlags");
import Batch = require("./batch");
import ChangeTracking = require("./mapping/changeTracking");
import IdentityGenerator = require("./id/identityGenerator");
import EntityMapping = require("./mapping/entityMapping");
import Collection = require("./driver/collection");
import Result = require("./core/result");
import Cursor = require("./cursor");

interface Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;
    mapping: EntityMapping;
    collection: Collection;

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any>;
    insert(batch: Batch, entity: any): Result<any>;
    remove(batch: Batch, entity: any): void;

    /**
     * Gets the appropriate batch from the list of available batches or creates a new one and adds it to the list.
     * @param batches The current list of batches.
     */
    selectBatch(batches: Table<Batch>): Batch;

    refresh(session: InternalSession, entity: any, callback: ResultCallback<any>): void;
    find(session: InternalSession, criteria: any): Cursor;
    findOneById(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void;
    findOne(session: InternalSession, criteria: any, callback: ResultCallback<any>): void;
    getReferencedEntities(session: InternalSession, entity: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void;
}

export = Persister;