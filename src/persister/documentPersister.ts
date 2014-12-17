/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import Callback = require("callback");
import CollectionTable = require("driver/collectionTable");
import DocumentBuilder = require("./documentBuilder");
import TypeMapping = require("../mapping/typeMapping");
import Bulk = require("../driver/bulk");
import BulkWriteResult = require("../driver/bulkWriteResult");

interface Batch {
    operation: Bulk;
    inserted: number;
    updated: number;
    deleted: number;
}

class DocumentPersister {

    private _documentBuilder: DocumentBuilder;
    private _collectionTable: CollectionTable;
    private _batchTable: { [id: number]: Batch } = {};
    private _batches: Batch[] = [];

    constructor(collectionTable: CollectionTable, documentBuilder: DocumentBuilder) {

        this._collectionTable = collectionTable;
        this._documentBuilder = documentBuilder;
    }

    addInsert(obj: any, mapping: TypeMapping): void {

        var document = this._documentBuilder.buildDocument(obj, mapping.type);

        var root = mapping.root;
        if(root.versioned) {
            // set initial value of of version field
            document[root.versionField] = 1;
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
            document = this._documentBuilder.buildDocument(obj, mapping.type),
            root = mapping.root;

        if(root.versioned) {
            query[root.versionField] = currentVersion;
            document[root.versionField] = currentVersion + 1;
        }

        var batch = this._getBatch(mapping);
        batch.updated++;
        batch.operation.find(query).replaceOne(document);
    }

    addDelete(obj: any, mapping: TypeMapping): void {

        var query: any = {
            _id: obj["_id"]
        }

        var root = mapping.root;
        if(root.lockable) {
            // TODO: when to release locks? on flush? on program exist?
            // TODO: don't bother checking lock field if we are the ones holding the lock
            // if object is lockable, check lock field
            query[root.lockField] = {
                $exists: false
            }
        }

        var batch = this._getBatch(mapping);
        batch.deleted++;
        batch.operation.find(query).removeOne();
    }

    execute(callback: Callback): void {

        async.each(this._batches, (batch: Batch, done: (err?: Error) => void) => {
            batch.operation.execute((err: Error, result: BulkWriteResult) => {
                if(err) return done(err);

                if(result.nRemoved != batch.deleted) {

                }

                if(result.nModified != batch.updated) {

                }

                if(result.nInserted != batch.inserted) {

                }

                // TODO: check results and make sure batch executed correctly.
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
            batch = {
                operation: this._collectionTable[id].initializeUnorderedBulkOp(),
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