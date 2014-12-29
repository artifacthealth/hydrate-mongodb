import TypeMapping = require("../mapping/TypeMapping");
import Collection = require("../driver/collection");
import Identifier = require('../id/identifier');
import ResultCallback = require("../core/resultCallback");
import InternalSession = require("../internalSession");
import InternalSessionFactory = require("../internalSessionFactory");
import DocumentSerializer = require("./documentSerializer");
import DocumentComparer = require("./documentComparer");
import ChangeTracking = require("../mapping/changeTracking");
import IdentityGenerator = require("../id/identityGenerator");
import Batch = require("./persisterBatch");

class EntityPersister {

    private _serializer: DocumentSerializer;

    changeTracking: ChangeTracking;
    identityGenerator: IdentityGenerator;

    constructor(factory: InternalSessionFactory, public mapping: TypeMapping, public collection: Collection) {

        this._serializer = new DocumentSerializer(factory, mapping.type);

        this.changeTracking = mapping.root.changeTracking;
        this.identityGenerator = mapping.root.identityGenerator;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): any {

        var document = this._serializer.write(entity);

        var changes = DocumentComparer.compare(originalDocument, document);
        if(changes.$set || changes.$unset) {
            batch.addUpdate(document["_id"], changes, this);
        }

        return document;
    }

    insert(batch: Batch, entity: any): any {

        var document = this._serializer.write(entity);
        batch.addInsert(document, this);
        return document;
    }

    remove(batch: Batch, entity: any): void {

        // TODO: serialize id
        batch.addRemove(entity["_id"], this);
    }

    load(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void {

        // TODO: serialize id
        this.collection.findOne({ _id: id }, (err, document) => {
            if (err) return callback(err);
            this._load(session, document, callback);
        });
    }

    // only call within async function
    private _load<T>(session: InternalSession, document: any, callback: ResultCallback<T>): void {

        // if the document is null or undefined then return undefined
        if (!document) {
            // note that we are not ensuring the callback is called async because _load will only
            // be called within an async function
            return callback(null);
        }

        // check to see if object is already loaded
        var entity = session.getObject(document["_id"]);
        if (entity) {
            return callback(null, entity);
        }

        var entity = this._serializer.read(document);
        session.registerManaged(this, entity, document);
        callback(null, entity);
    }
}

export = EntityPersister;