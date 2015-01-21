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
import Result = require("./core/result");
import Cursor = require("./cursor");
import Callback = require("./core/callback");

interface Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any>;
    insert(batch: Batch, entity: any): Result<any>;
    remove(batch: Batch, entity: any): void;

    load(documents: any[]): Result<any[]>;
    loadOne(document: any): Result<any>;

    findInverseOf(id: Identifier, path: string, callback: ResultCallback<any[]>): void;
    findOneInverseOf(id: Identifier, path: string, callback: ResultCallback<any>): void;
    findOneById(id: Identifier, callback: ResultCallback<any>): void;

    find(criteria: any): Cursor;
    findOne(criteria: any, callback: ResultCallback<any>): void;

    resolve(entity: any, path: string, callback: Callback): void;
    refresh(entity: any, callback: ResultCallback<any>): void;
}

export = Persister;