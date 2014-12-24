/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import Callback = require("callback");
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

        if(mapping.root.versioned) {
            // set initial value of of version field
            document[mapping.root.versionField] = 1;
        }

        var batch = this._getBatch(mapping);
        batch.inserted++;
        batch.operation.insert(document);
    }

    addUpdate(obj: any, mapping: TypeMapping): void {

        // TODO: Change to actual update instead of replacement
        var query: any = {
            _id: obj["_id"]
        }

        var currentVersion = 0,
            document = this._documentBuilder.buildDocument(obj, mapping.type);

        if(mapping.root.versioned) {
            query[mapping.root.versionField] = currentVersion;
            document[mapping.root.versionField] = currentVersion + 1;
        }

        var batch = this._getBatch(mapping);
        batch.updated++;
        batch.operation.find(query).replaceOne(document);
    }

    addDelete(obj: any, mapping: TypeMapping): void {

        var query: any = {
            _id: obj["_id"]
        }

        var batch = this._getBatch(mapping);
        batch.deleted++;
        batch.operation.find(query).removeOne();
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

                if((result.nRemoved || 0) != batch.deleted || (result.nModified || 0) != batch.updated || (result.nInserted || 0) != batch.inserted) {
                    // TODO: provide more detailed error information
                    return done(new Error("Flush failed. Not all queued operations for collection '" + batch.collectionName + "' executed correctly."));
                }

                done();
            });

        }, (err: Error) => {
            if(err) return callback(err);
            callback();
        });
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