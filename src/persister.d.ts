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
import Query = require("./query/query");

interface Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any>;
    addInsert(batch: Batch, entity: any): Result<any>;
    addRemove(batch: Batch, entity: any): void;

    findInverseOf(id: Identifier, path: string, callback: ResultCallback<any[]>): void;
    findOneInverseOf(id: Identifier, path: string, callback: ResultCallback<any>): void;

    findAll(criteria: any): Cursor<any>;
    findOne(criteria: Object, callback: ResultCallback<any>): void;
    findOneById(id: Identifier, callback: ResultCallback<any>): void;
    findOneAndRemove(criteria: Object, sort: [string, number][], callback: ResultCallback<any>): void;
    findOneAndUpdate(criteria: Object, sort: [string, number][], returnNew: boolean, updateDocument: Object, callback: ResultCallback<any>): void;

    distinct(key: string, criteria: Object, callback: ResultCallback<any[]>): void;
    count(criteria: Object, limit: number, skip: number, callback: ResultCallback<number>): void;

    removeAll(criteria: Object, callback?: ResultCallback<number>): void;
    removeOne(criteria: Object, callback?: Callback): void;
    updateAll(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void;
    updateOne(criteria: Object, updateDocument: Object, callback?: Callback): void;

    resolve(entity: any, path: string, callback: Callback): void;
    refresh(entity: any, callback: ResultCallback<any>): void;
}

export = Persister;