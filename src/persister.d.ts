/// <reference path="../typings/async.d.ts" />

import {Table} from "./core/table";
import {ResultCallback} from "./core/resultCallback";
import {InternalSession} from "./internalSession";
import {PropertyFlags} from "./mapping/propertyFlags";
import {Batch} from "./batch";
import {ChangeTrackingType} from "./mapping/changeTrackingType";
import {IdentityGenerator} from "./id/identityGenerator";
import {EntityMapping} from "./mapping/entityMapping";
import {Result} from "./core/result";
import {Callback} from "./core/callback";
import {QueryDefinition} from "./query/queryDefinition";
import {Observer} from "./observer";

export interface Persister {

    changeTracking: ChangeTrackingType;
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
