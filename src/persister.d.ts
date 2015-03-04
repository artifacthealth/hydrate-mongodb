/// <reference path="../typings/async.d.ts" />

import Table = require("./core/table");
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import PropertyFlags = require("./mapping/propertyFlags");
import Batch = require("./batch");
import ChangeTracking = require("./mapping/changeTracking");
import IdentityGenerator = require("./id/identityGenerator");
import EntityMapping = require("./mapping/entityMapping");
import Result = require("./core/result");
import Callback = require("./core/callback");
import QueryDefinition = require("./query/queryDefinition");
import Observer = require("./observer");

interface Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    dirtyCheck(batch: Batch, entity: Object, originalDocument: Object): Result<Object>;
    addInsert(batch: Batch, entity: Object): Result<Object>;
    addRemove(batch: Batch, entity: Object): void;

    fetch(entity: Object, path: string, callback: Callback): void;
    refresh(entity: Object, callback: ResultCallback<Object>): void;
    watch(value: any, observer: Observer): void;
    executeQuery(query: QueryDefinition, callback: ResultCallback<Object>): void;

    findOneById(id: any, callback: ResultCallback<any>): void;
    findInverseOf(entity: Object, path: string, callback: ResultCallback<Object[]>): void;
    findOneInverseOf(entity: Object, path: string, callback: ResultCallback<Object>): void;
}

export = Persister;