/// <reference path="../../typings/async.d.ts" />

import async = require("async");

import IdentityGenerator = require("../id/identityGenerator");
import MappingError = require("./mappingError");
import ClassMapping = require("./classMapping");
import ChangeTracking = require("./changeTracking");
import Index = require("./index");
import CollectionOptions = require("../driver/collectionOptions");
import MappingRegistry = require("./mappingRegistry");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");

class EntityMapping extends ClassMapping {

    collectionName: string;
    databaseName: string;
    indexes: Index[];
    collectionOptions: CollectionOptions;

    identity: IdentityGenerator;

    changeTracking: ChangeTracking;

    versioned: boolean;
    versionField: string;

    lockable: boolean;
    lockField: string;

    constructor(registry: MappingRegistry, inheritanceRoot?: EntityMapping) {
        super(registry, inheritanceRoot);

        this.flags &= ~MappingFlags.Embeddable;
        this.flags |= MappingFlags.Entity;
    }

    addIndex(index: Index): void {

        if(this.inheritanceRoot !== this) {
            (<EntityMapping>this.inheritanceRoot).addIndex(index);
            return;
        }

        if(!this.indexes) {
            this.indexes = [];
        }
        this.indexes.push(index);
    }

    refresh(session: InternalSession, entity: any, document: any, errors: MappingError[]): any {

        var path = "";
        var mapping = this.inheritanceRoot.getMapping(document, path, errors);
        if (mapping) {
            if(mapping != this) {
                // http://jsperf.com/change-proto-on-class
                errors.push({ message: "Refresh does not support changing instantiated class of entity.", path: path, value: document });
                return;
            }
            return this.readObject(session, entity, document, path, errors, /* checkRemoved */ true);
        }
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        var id: any;

        // if this is not the top level, the value should be the id
        if(path) {
            // TODO: handle DBRef
            id = value;
        }
        else {
            // otherwise, get the value from the document
            id = value["_id"];
            if (!id) {
                errors.push({message: "Missing identifier.", path: "_id", value: value});
                return;
            }
        }

        // TODO: handle DBRef
        if(!(<EntityMapping>this.inheritanceRoot).identity.validate(id)) {
            errors.push({ message: "'" + id.toString() + "' is not a valid identifier.", path: (path ? path + "." : "") + "_id", value: id });
            return;
        }

        // if this is not the top level
        if(path) {
            // TODO: confirm how we want to handle ObjectState.Removed.
            return session.getReferenceInternal(this, id);
        }

        var obj = super.read(session, value, path, errors);
        obj["_id"] = id;
        return obj;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        var id: any;

        // Note that this.classConstructor could represent a base class since we are checking the id before looking up
        // the mapping for the current object in Class.write.
        // TODO: validate mapping that all classes inherit from inheritanceRoot or this ^ may not work
        // if the value is not an instance of the entity's constructor then it should be an identifier or DBRef
        if(Reference.isReference(value)) {
            // TODO: handle DBRef
            id = (<Reference>value).id;
        }
        else {
            // otherwise, retrieve the id from the object
            if(!(id = value["_id"])) {
                errors.push({ message: "Missing identifier.", path: (path ? path + "." : "") + "_id", value: value });
                return;
            }
        }

        if(!(<EntityMapping>this.inheritanceRoot).identity.validate(id)) {
            errors.push({ message: "'" + id.toString() + "' is not a valid identifier.", path: (path ? path + "." : "") + "_id", value: id });
            return;
        }

        // if this is not the top level then just return a reference
        if(path) {
            // TODO: decide when to save reference as a DBRef
            return id;
        }

        var document = super.write(value, path, errors, visited);
        if(document) {
            document["_id"] = id;
        }
        return document;
    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // if this is the top level then do a full comparison; otherwise, just compare id's
        if(!path) {
            super.compare(objectValue, documentValue, changes, path);
            return;
        }

        var id: any;
        // if the value is not an instance of the entity's constructor then it should be an identifier or DBRef
        if(!(objectValue instanceof this.classConstructor)) {
            // TODO: handle DBRef
            id = objectValue;
        }
        else {
            // otherwise, retrieve the id from the object
            if(!(id = objectValue["_id"])) {
                // TODO: handle missing identifier
                return;
            }
        }

        if(!(<EntityMapping>this.inheritanceRoot).identity.areEqual(id, documentValue)) {
            (changes["$set"] || (changes["$set"] = {}))[path] = id;
        }
    }

    areDocumentsEqual(document1: any, document2: any): boolean {

        return super.areEqual(document1, document2);
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        var id1 = documentValue1["_id"] || documentValue1,
            id2 = documentValue2["_id"] || documentValue2;

        if(id1 === null || id1 === undefined || id2 === null || id2 === undefined) {
            return false;
        }

        return (<EntityMapping>this.inheritanceRoot).identity.areEqual(id1, id2)
    }

    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!value || typeof value !== "object") return;

        if(Reference.isReference(value)) {
            // TODO: handle DBRef
            var entity = (<Reference>value).getObject();
            if (entity) {
                value = entity;
            }
            else {
                if(flags & PropertyFlags.Dereference) {
                    // store reference to resolve later
                    references.push(value);
                }
                return;
            }
        }

        if (entities.indexOf(value) !== -1) return;
        entities.push(value);

        super.walk(value, flags, entities, embedded, references);
    }

    resolve(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if (!value || typeof value !== "object") return;

        if(Reference.isReference(value)) {
            // TODO: handle DBRef
            // We don't bother with the call to getObject here since fetch will call getObject. The reason we have the
            // separate call to getObject in 'walk' above is that walk only calls fetch if ProperFlags.Dereference is
            // passed in but should still include the object in the found entities if the object is managed.
            (<Reference>value).fetch((err, entity) => {
                if(err) return callback(err);
                super.resolve(session, entity, entity, path, depth, callback);
            });
            return;
        }

        super.resolve(session, value, value, path, depth, callback);
    }

    resolveInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!parentEntity) {
            return callback(new Error("Parent entity required to resolve inverse relationship."));
        }

        var id = session.getId(parentEntity);
        if(id === undefined) {
            return callback(new Error("Missing identifier on parent entity."));
        }

        var property = this.getProperty(propertyName);
        if(property === undefined) {
            return callback(new Error("Missing property '" + propertyName + "'."));
        }

        var query = {};
        property.setFieldValue(query, id);

        var persister = session.getPersister(this);
        persister.findOne(query, (err, value) => {
            if(err) return callback(err);
            super.resolve(session, this, value, path, depth, callback);
        });
    }
}

export = EntityMapping;