/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import Callback = require("../core/callback");
import CollectionTable = require("driver/collectionTable");
import DocumentBuilder = require("./documentBuilder");
import TypeMapping = require("../mapping/typeMapping");
import Bulk = require("../driver/bulk");
import BulkWriteResult = require("../driver/bulkWriteResult");
import InternalSession = require("../internalSession");

interface Batch {
    collectionName: string;
    operation: Bulk;
    inserted: number;
    updated: number;
    deleted: number;
}

// TODO: consider performance with a write concern of 0 and checking errors afterwards. See https://blog.compose.io/faster-updates-with-mongodb-2-4/
// TODO: retry write after error? updates need to be idempotent so you can reapply full batch without side-effects
class DocumentPersister {

    private _documentBuilder: DocumentBuilder;
    private _session: InternalSession;
    private _batchTable: { [id: number]: Batch } = {};
    private _batches: Batch[] = [];

    constructor(session: InternalSession, documentBuilder: DocumentBuilder) {

        this._session = session;
        this._documentBuilder = documentBuilder;
    }

    addInsert(obj: any, mapping: TypeMapping): void {

        var document = this._documentBuilder.buildDocument(obj, mapping.type);
/*
        if(mapping.root.versioned) {
            // set initial value of version field
            document[mapping.root.versionField] = 1;
        }*/

        var batch = this._getBatch(mapping);
        batch.inserted++;
        batch.operation.insert(document);
        console.log("INSERT: " + JSON.stringify(document, null, "\t"));
    }

    addUpdate(obj: any, mapping: TypeMapping): void {

        // TODO: Change to actual update instead of replacement
        var query: any = {
            _id: obj["_id"]
        }

        var document = this._documentBuilder.buildDocument(obj, mapping.type);
/*
        if(mapping.root.versioned) {
            var currentVersion = document[mapping.root.versionField];
            query[mapping.root.versionField] = currentVersion;
            document[mapping.root.versionField] = currentVersion + 1;
        }
*/
        var batch = this._getBatch(mapping);
        batch.updated++;
        batch.operation.find(query).replaceOne(document);
        console.log("UPDATE: " + JSON.stringify(document, null, "\t"));
    }

    addDelete(obj: any, mapping: TypeMapping): void {

        var query: any = {
            _id: obj["_id"]
        }

        var batch = this._getBatch(mapping);
        batch.deleted++;
        batch.operation.find(query).removeOne();
        console.log("DELETE: " + JSON.stringify(document, null, "\t"));
    }

    execute(callback: Callback): void {

        if(this._batches.length == 0) {
            process.nextTick(() => {
                callback();
            });
            return;
        }

        async.each(this._batches, (batch: Batch, done: (err?: Error) => void) => {
            batch.operation.execute((err: Error, result: BulkWriteResult) => {
                if(err) return done(err);

                // TODO: provide more detailed error information
                if((result.nInserted || 0) != batch.inserted) {
                    return done(new Error("Flush failed for collection '" + batch.collectionName + "'. Expected to insert " + batch.inserted + " documents but only inserted " + (result.nInserted || 0) + "."));
                }

                if((result.nModified || 0) != batch.updated) {
                    return done(new Error("Flush failed for collection '" + batch.collectionName + "'. Expected to update " + batch.updated + " documents but only updated " + (result.nModified || 0) + "."));
                }

                if((result.nRemoved || 0) != batch.deleted) {
                    return done(new Error("Flush failed for collection '" + batch.collectionName + "'. Expected to delete " + batch.deleted + " documents but only deleted " + (result.nRemoved || 0) + "."));
                }

                done();
            });

        }, callback);
    }

    private _getBatch(mapping: TypeMapping): Batch {

        var id = mapping.root.id,
            batch = this._batchTable[id];

        if(batch === undefined) {
            var col = this._session.getCollection(mapping);
            batch = {
                collectionName: col.collectionName,
                operation: col.initializeUnorderedBulkOp(),
                inserted: 0,
                updated: 0,
                deleted: 0
            }
            this._batchTable[id] = batch;
            this._batches.push(batch);
        }

        return batch;
    }
}

export = DocumentPersister;