import ResultCallback = require("resultCallback.d");
import Collection = require("driver/collection.d");
import DocumentBuilder = require("./documentBuilder");

class DocumentPersister {

    private _queuedInserts: any[];
    private _queuedUpdates: any[];
    private _queuedDeletes: any[];

    constructor(collection: Collection, documentBuilder: DocumentBuilder) {

    }

    addInsert(obj: any): void {

    }

    addUpdate(obj: any): void {

    }

    addDelete(obj: any): void {

    }

    execute(callback: ResultCallback<any>): void {

    }

}