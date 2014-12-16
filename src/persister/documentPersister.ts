/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import Callback = require("callback");
import CollectionTable = require("driver/collectionTable");
import DocumentBuilder = require("./documentBuilder");
import TypeMapping = require("../mapping/typeMapping");

class DocumentPersister {

    private _documentBuilder: DocumentBuilder;
    private _collectionTable: CollectionTable;
    private _batchTable: { [id: number]: any } = {};
    private _batches: any[] = [];

    constructor(collectionTable: CollectionTable, documentBuilder: DocumentBuilder) {

        this._collectionTable = collectionTable;
        this._documentBuilder = documentBuilder;
    }

    addInsert(obj: any, mapping: TypeMapping): void {

        this._getBatch(mapping).insert(this._documentBuilder.buildDocument(obj, mapping.type));
    }

    addUpdate(obj: any, mapping: TypeMapping): void {

        // TODO: Change to actual update instead of replacement
        this._getBatch(mapping).find({ _id: obj["_id"] }).replaceOne(this._documentBuilder.buildDocument(obj, mapping.type));
    }

    addDelete(obj: any, mapping: TypeMapping): void {

        this._getBatch(mapping).find({ _id: obj["_id"] }).removeOne();
    }

    execute(callback: Callback): void {

        async.each(this._batches, (batch: any, done: (err?: Error) => void) => {
            batch.execute(done);

        }, (err: Error) => {
            if(err) return callback(err);
            callback();
        });
    }

    private _getBatch(mapping: TypeMapping): any {

        var id = mapping.root.id,
            batch = this._batchTable[id];

        if(batch === undefined) {
            batch = this._collectionTable[id].initializeUnorderedBulkOp();
            this._batchTable[id] = batch;
            this._batches.push(batch);
        }

        return batch;
    }
}

export = DocumentPersister;