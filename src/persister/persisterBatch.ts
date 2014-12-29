/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import Callback = require("../core/callback");
import CollectionTable = require("driver/collectionTable");
import Persister = require("./entityPersister");
import Bulk = require("../driver/bulk");
import BulkWriteResult = require("../driver/bulkWriteResult");
import InternalSession = require("../internalSession");
import Changes = require("./changes");

interface CollectionBatch {
    collectionName: string;
    operation: Bulk;
    inserted: number;
    updated: number;
    removed: number;
}

// TODO: consider performance with a write concern of 0 and checking errors afterwards. See https://blog.compose.io/faster-updates-with-mongodb-2-4/
// TODO: retry write after error? updates need to be idempotent so you can reapply full batch without side-effects
class PersisterBatch {

    private _batchTable: { [id: number]: CollectionBatch } = {};
    private _batches: CollectionBatch[] = [];

    addInsert(document: any, persister: Persister): void {

        var batch = this._getBatch(persister);
        batch.inserted++;
        batch.operation.insert(document);
        console.log("INSERT: " + JSON.stringify(document, null, "\t"));
    }

    addUpdate(id: any, changes: Changes, persister: Persister): void {

        // TODO: Change to actual update instead of replacement
        var query: any = {
            _id: id
        }

        var batch = this._getBatch(persister);
        batch.updated++;
        batch.operation.find(query).update(changes);
        console.log("UPDATE: " + JSON.stringify(changes, null, "\t"));
    }

    addRemove(id: any, persister: Persister): void {

        var query: any = {
            _id: id
        }

        var batch = this._getBatch(persister);
        batch.removed++;
        batch.operation.find(query).removeOne();
        console.log("REMOVE: " + JSON.stringify(document, null, "\t"));
    }

    execute(callback: Callback): void {

        if(this._batches.length == 0) {
            process.nextTick(() => {
                callback();
            });
            return;
        }

        async.each(this._batches, (batch: CollectionBatch, done: (err?: Error) => void) => {
            batch.operation.execute((err: Error, result: BulkWriteResult) => {
                if(err) return done(err);

                // TODO: provide more detailed error information
                if((result.nInserted || 0) != batch.inserted) {
                    return done(new Error("Flush failed for collection '" + batch.collectionName + "'. Expected to insert " + batch.inserted + " documents but only inserted " + (result.nInserted || 0) + "."));
                }

                if((result.nModified || 0) != batch.updated) {
                    return done(new Error("Flush failed for collection '" + batch.collectionName + "'. Expected to update " + batch.updated + " documents but only updated " + (result.nModified || 0) + "."));
                }

                if((result.nRemoved || 0) != batch.removed) {
                    return done(new Error("Flush failed for collection '" + batch.collectionName + "'. Expected to remove " + batch.removed + " documents but only removed " + (result.nRemoved || 0) + "."));
                }

                done();
            });

        }, callback);
    }

    private _getBatch(persister: Persister): CollectionBatch {

        var id = persister.mapping.root.id,
            batch = this._batchTable[id];

        if(batch === undefined) {
            batch = {
                collectionName: persister.collection.collectionName,
                operation: persister.collection.initializeUnorderedBulkOp(),
                inserted: 0,
                updated: 0,
                removed: 0
            }
            this._batchTable[id] = batch;
            this._batches.push(batch);
        }

        return batch;
    }
}

export = PersisterBatch;