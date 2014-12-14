import Callback = require("resultCallback.d");
import Collection = require("driver/collection.d");
import DocumentBuilder = require("./documentBuilder");
import TypeMapping = require("./mapping/typeMapping");

class DocumentPersister {

    private _documentBuilder: DocumentBuilder;
    private _batch: any;

    constructor(collection: Collection, documentBuilder: DocumentBuilder) {

        this._documentBuilder = documentBuilder;
        this._batch = (<any>collection).initializeUnorderedBulkOp();
    }

    addInsert(obj: any, mapping: TypeMapping): void {

        this._batch.insert(this._documentBuilder.buildDocument(obj, mapping.type));
    }

    addUpdate(obj: any, mapping: TypeMapping): void {

        // TODO: Change to actual update instead of replacement
        this._batch.find({ _id: obj["_id"] }).replaceOne(this._documentBuilder.buildDocument(obj, mapping.type));
    }

    addDelete(obj: any, mapping: TypeMapping): void {

        this._batch.find({ _id: obj["_id"] }).removeOne();
    }

    execute(callback: Callback): void {

        this._batch.execute(callback);
    }

}

export = DocumentPersister;