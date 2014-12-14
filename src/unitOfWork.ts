import ChangeTracking = require("./mapping/changeTracking");
import CollectionTable = require("./driver/collectionTable");
import Constructor = require("./constructor");
import MappingRegistry = require("./mapping/mappingRegistry");
import Map = require("./map");
import Callback = require("./callback");
import ResultCallback = require("./resultCallback");
import TypeMapping = require("./mapping/typeMapping");
import Identifier = require("./id/identifier");
import LockMode = require("./lockMode");
import ObjectBuilder = require("./objectBuilder");
import DocumentPersister = require("./documentPersister");
import DocumentBuilder = require("./documentBuilder");

enum ObjectState {

    /**
     * Managed entities have a persistent identity and are associated with a persistence context.
     */
    Managed,

    /**
     * Detached entities have a persistent identity and are not currently associated with a persistence context.
     */
    Detached,

    /**
     * Removed entities  have a persistent identity, are associated with a persistent context, and are
     * scheduled for deletion from the mongodb. Once the entity is deleted from the mongodb, it is considered a
     * new entity.
     */
    Removed
}

enum Operation {
    None = 0,
    Insert,
    Update,
    Delete,
    DirtyCheck
}

// TODO: option to use weak reference until object is removed or modified and attach event to unlink if garbage collected? https://github.com/TooTallNate/node-weak
interface ObjectLinks {

    state: ObjectState;
    scheduledOperation: Operation;
    object: any;
    originalDocument?: any;
    mapping: TypeMapping;
}

class UnitOfWork {

    private _collections: CollectionTable;
    private _mappingRegistry: MappingRegistry;
    private _objectLinks: Map<ObjectLinks> = {};
    private _objectBuilder: ObjectBuilder;
    private _documentBuilder: DocumentBuilder;

    constructor(collections: CollectionTable, mappingRegistry: MappingRegistry) {

        this._collections = collections;
        this._mappingRegistry = mappingRegistry;
        this._objectBuilder = new ObjectBuilder(mappingRegistry);
        this._documentBuilder = new DocumentBuilder(mappingRegistry);
    }

    persist (obj: any): void {

        var links = this._getObjectLinks(obj);
        if(!links) {
            var mapping = this._mappingRegistry.getMappingForObject(obj);
            if(!mapping) {
                throw new Error("Object is not mapped as a document type.");
            }

            // we haven't seen this object before
            obj["_id"] = mapping.generateIdentifier();
            this._linkObject(obj, mapping, Operation.Insert);
            return;
        }

        switch(links.state) {
            case ObjectState.Managed:
                if(links.mapping.hasChangeTracking(ChangeTracking.DeferredExplicit) && !links.scheduledOperation) {
                    links.scheduledOperation = Operation.DirtyCheck;
                }
                // TODO: cascade persist to references flagged with cascadepersit even if current object is already managed
                break;
            case ObjectState.Detached:
                throw new Error("Cannot persist a detached object.");
                break;
            case ObjectState.Removed:
                // Cancel delete operation and make managed.
                links.scheduledOperation = Operation.None;
                links.state = ObjectState.Managed;
                break;
        }
    }

    remove (obj: any): void {

        // TODO: cascade remove to references flagged with cascaderemove event if current object is not managed
        var links = this._getObjectLinks(obj);
        if(!links) return;

        switch(links.state) {
            case ObjectState.Managed:
                // if the object has never been persisted then unlink the object and clear it's id
                if(links.scheduledOperation == Operation.Insert) {
                    this._unlinkObject(links);
                }
                else {
                    links.scheduledOperation = Operation.Delete;
                    links.state = ObjectState.Removed;
                    // TODO: after successful delete operation, unlink the object and clear the object's identifier
                }
                break;
            case ObjectState.Detached:
                throw new Error("Cannot remove a detached object.");
                break;
            case ObjectState.Removed:
                // nothing to do
                break;
        }
    }

    detach(obj: any): void {

        var links = this._getObjectLinks(obj);
        if(links && links.state == ObjectState.Managed) {
            this._unlinkObject(links);
        }
    }

    flush(callback: Callback): void {

        var persisters: { [id: number]: DocumentPersister } = {};

        var objectLinks = this._objectLinks;
        for(var id in objectLinks) {
            if(objectLinks.hasOwnProperty(id)) {
                var links = objectLinks[id];
                var rootMappingId = links.mapping.rootType.id;
                var persister = persisters[rootMappingId];
                if(!persister) {
                    persister = new DocumentPersister(this._collections[rootMappingId], this._documentBuilder);
                    persisters[rootMappingId] = persister;
                }
            }
        }
    }

    find<T>(ctr: Constructor<T>, id: Identifier, callback: ResultCallback<T>): void {

        // check to see if object is already loaded
        var links = this._getObjectLinksById(id);
        if(links) {
            process.nextTick(() => {
                callback(null, links.object);
            })
            return;
        }

        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if(!mapping) {
            return callback(new Error("Object is not mapped as a document type."));
        }

        this._collections[mapping.id].findOne({ _id: id }, (err, document) => {
            if(err) return callback(err);

            this._load(mapping, document, callback);
        });
    }

    private _load<T>(mapping: TypeMapping, document: any, callback: ResultCallback<T>): void {

        // if the document is null or undefined then return undefined
        if(!document) {
            return process.nextTick(() => {
                callback(null);
            });
        }

        // check to see if object is already loaded
        var links = this._getObjectLinksById(document["_id"]);
        if(links) {
            return process.nextTick(() => {
                callback(null, links.object);
            });
        }

        var obj = this._objectBuilder.buildObject(document, mapping.type);
        var links = this._linkObject(obj, mapping);
        // save the original document for dirty checking
        links.originalDocument = document;

        callback(null, obj);
    }

    private _getObjectLinksById(id: Identifier): ObjectLinks {

        return this._objectLinks[id.toString()];
    }

    private _getObjectLinks(obj: any): ObjectLinks {

        var id = obj["_id"];
        if(id) {
            var links = this._objectLinks[id.toString()];
            if(!links) {
                // If we have an id but no links then the object must be detached since we assume that we manage
                // the assignment of the identifier. Create object links.
                links = this._linkObject(obj);
                links.state = ObjectState.Detached;
            }
            return links;
        }
    }

    private _linkObject(obj: any, mapping?: TypeMapping, operation = Operation.None): ObjectLinks {

        if(!mapping) {
            var mapping = this._mappingRegistry.getMappingForObject(obj);
            if(!mapping) {
                throw new Error("Object is not mapped as a document type.");
            }
        }

        var links = {
            state: ObjectState.Managed,
            scheduledOperation: operation,
            object: obj,
            mapping: mapping
        }

        return this._objectLinks[obj["_id"].toString()] = links;
    }

    private _unlinkObject(links: ObjectLinks): void {

        delete this._objectLinks[links.object["_id"].toString()];
        // if the object was never persisted or if it has been removed, then clear it's identifier as well
        if(links.scheduledOperation == Operation.Insert || links.state == ObjectState.Removed) {
            this._clearIdentifier(links.object);
        }
    }

    private _clearIdentifier(obj: any): void {

        delete obj["_id"];
    }
}

export = UnitOfWork;