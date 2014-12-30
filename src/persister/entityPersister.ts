/// <reference path="../../typings/tsreflect.d.ts" />
/// <reference path="../../typings/async.d.ts" />

import reflect = require("tsreflect");
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
import Batch = require("./batch");
import Callback = require("../core/callback");
import TypeMappingFlags = require("../mapping/typeMappingFlags");


import PropertyFlags = require("../mapping/propertyFlags");

interface Reference {
    mapping: TypeMapping;
    id: Identifier;
    object: any;
    key: string;
}

class EntityPersister {

    private _serializer: DocumentSerializer;

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    constructor(public factory: InternalSessionFactory, public mapping: TypeMapping, public collection: Collection) {

        this._serializer = new DocumentSerializer(factory, mapping.type);

        this.changeTracking = mapping.root.changeTracking;
        this.identity = mapping.root.identity;
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

        batch.addRemove(entity["_id"], this);
    }

    load(session: InternalSession, id: Identifier, callback: ResultCallback<any>): void {

        // TODO: check session.getObject?
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

    walk(session: InternalSession, obj: any, flags: PropertyFlags, callback: ResultCallback<any[]>): void {

        var persister = this.factory.getPersisterForObject(obj);
        if (!persister) {
            return process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
        }

        var entities: any[] = [],
            embedded: any[] = [];
        this._walkEntity(session, obj, persister.mapping, flags, entities, embedded, err => {
            if(err) return process.nextTick(() => callback(err));
            return process.nextTick(() => callback(null, entities));
        });
    }

    private _walkEntity(session: InternalSession, entity: any, mapping: TypeMapping, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {

        var references: Reference[] = [];
        this._walkValue(session, entity, mapping.type, flags, entities, embedded, references);

        // TODO: load references in batches grouped by root mapping
        async.each(references, (reference: Reference, done: (err?: Error) => void) => {

            var persister = this.factory.getPersisterForMapping(reference.mapping);
            persister.load(session, reference.id, (err: Error, entity: any) => {
                if (err) return done(err);

                // replace reference with object
                reference.object[reference.key] = entity;

                // now walk entity
                this._walkEntity(session, entity, reference.mapping, flags, entities, embedded, callback);
            });
        }, callback);
    }

    private _walkValue(session: InternalSession, value: any, type: reflect.Type, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[], key?: any): void {

        if (value === null || value === undefined) return;

        if (type.isTuple()) {
            if (Array.isArray(value)) {
                var elementTypes = type.getElementTypes();
                for (var i = 0, l = Math.min(value.length, elementTypes.length); i < l; i++) {
                    this._walkValue(session, value[i], elementTypes[i], flags, entities, embedded, references, i);
                }
            }
            return;
        }

        if (type.isArray()) {
            if (Array.isArray(value)) {
                var elementType = type.getElementType();
                for (i = 0, l = value.length; i < l; i++) {
                    this._walkValue(session, value[i], elementType, flags, entities, embedded, references, i);
                }
            }
            return;
        }
        // TODO: handle indexed types

        if (type.isObjectType()) {
            // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
            // does not exist, default to mapping for type.
            var mapping = this.factory.getMappingForObject(value) || this.factory.getMappingForType(type);
            if (!mapping) return;

            if (mapping.flags & TypeMappingFlags.DocumentType) {
                // if the object is not an instance of the entity's constructor then it should be an identifier or DBRef
                if(!(value instanceof mapping.classConstructor)) {
                    // TODO: handle DBRef
                    if(!mapping.root.identity.validate(value)) {
                        return;
                    }
                    var entity = session.getObject(value);
                    if (entity) {
                        value = entity;
                    }
                    else {
                        if(flags & PropertyFlags.Dereference) {
                            // store reference to resolve later
                            references.push({ mapping: mapping, id: value, object: value, key: key });
                        }
                        return;
                    }
                }
                if (entities.indexOf(value) !== -1) return;
                entities.push(value);
            }
            else {
                if (embedded.indexOf(value) !== -1) return;
                embedded.push(value);
            }

            var properties = mapping.properties;
            for (var i = 0, l = properties.length; i < l; i++) {
                var property = properties[i];
                // if the property is not ignored and it has the specified flags, then walk the value of the property
                if (!(property.flags & PropertyFlags.Ignored) && (property.flags & flags)) {
                    this._walkValue(session, property.symbol.getValue(value), property.symbol.getType(), flags, entities, embedded, references, property.name);
                }
            }
        }
    }
}

export = EntityPersister;