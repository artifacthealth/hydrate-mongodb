/// <reference path="../../typings/async.d.ts" />

import async = require("async");

import IdentityGenerator = require("../id/identityGenerator");
import MappingError = require("./mappingError");
import ClassMapping = require("./classMapping");
import ChangeTracking = require("./changeTracking");
import Index = require("./index");
import CollectionOptions = require("./collectionOptions");
import MappingRegistry = require("./mappingRegistry");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");
import ResolveContext = require("./resolveContext");
import ReadContext = require("./readContext");
import Observer = require("../observer");

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

    constructor(baseClass?: EntityMapping) {
        super(baseClass);

        this.flags &= ~MappingFlags.Embeddable;
        this.flags |= MappingFlags.Entity;
    }

    setDocumentVersion(obj: any, version: number): void {

        // TODO: escape versionField
        this.setDocumentVersion = <any>(new Function("o", "v", "o['" + (<EntityMapping>this.inheritanceRoot).versionField + "'] = v"));
        obj[(<EntityMapping>this.inheritanceRoot).versionField] = version;
    }

    getDocumentVersion(obj: any): number {

        // TODO: escape versionField
        this.getDocumentVersion = <any>(new Function("o", "return o['" + (<EntityMapping>this.inheritanceRoot).versionField + "']"));
        return obj[(<EntityMapping>this.inheritanceRoot).versionField]
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

    refresh(context: ReadContext, entity: any, document: any): any {

        var mapping = this.inheritanceRoot.getMapping(context, document);
        if (mapping) {
            if(mapping != this) {
                // http://jsperf.com/change-proto-on-class
                // http://stackoverflow.com/questions/23807805/why-is-mutating-the-prototype-of-an-object-bad-for-performance
                context.addError("Refresh does not support changing instantiated class of entity.");
                return;
            }
            return this.readObject(context, entity, document, /* checkRemoved */ true);
        }
    }

    read(context: ReadContext, value: any): any {

        var id: any;

        // if this is not the top level, the value should be the id
        if(context.path) {
            // TODO: handle DBRef
            id = value;
        }
        else {
            // otherwise, get the value from the document
            id = value["_id"];
            if (!id) {
                context.addError("Missing identifier.", "_id");
                return;
            }
        }

        // TODO: handle DBRef
        if(!(<EntityMapping>this.inheritanceRoot).identity.validate(id)) {
            context.addError("'" + id.toString() + "' is not a valid identifier.", (context.path ? context.path + "." : "") + "_id");
            return;
        }

        // if this is not the top level
        if(context.path) {
            // TODO: confirm how we want to handle ObjectState.Removed.
            return context.session.getReferenceInternal(this, id);
        }

        var obj = super.read(context, value);
        obj["_id"] = id;
        return obj;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        var id: any;

        // Note that this.classConstructor could represent a base class since we are checking the id before looking up
        // the mapping for the current object in Class.write.
        // TODO: validate mapping that all classes inherit from inheritanceRoot or this ^ may not work
        // if the value is not an instance of the entity's constructor then it should be an identifier or DBRef

        // TODO: Use session.getId?
        // retrieve the id from the object
        if(!(id = value["_id"])) {
            errors.push({ message: "Missing identifier.", path: (path ? path + "." : "") + "_id", value: value });
            return;
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

    watchEntity(entity: any, observer: Observer): void {

        super.watch(entity, observer, []);
    }

    watch(value: any, observer: Observer, visited: any[]): void {

        // Do nothing. Watch does not propagate to other entities.
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

    walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!value || typeof value !== "object") return;

        if(Reference.isReference(value)) {
            // TODO: handle DBRef
            var entity = session.getObject((<Reference>value).getId());
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

        // If this isn't the first entity, only continue if we have the WalkEntities flag
        if((this.flags & PropertyFlags.WalkEntities) == 0 && entities.length > 1) return;

        super.walk(session, value, flags, entities, embedded, references);
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if (!value || typeof value !== "object") {
            return callback(null, value);
        }

        if(Reference.isReference(value)) {
            // TODO: handle DBRef
            // We don't bother with the call to getObject here since fetch will call getObject. The reason we have the
            // separate call to getObject in 'walk' above is that walk only calls fetch if ProperFlags.Dereference is
            // passed in but should still include the object in the found entities if the object is managed.
            (<Reference>value).fetch(session, (err, entity) => {
                if(err) return callback(err);
                super.fetch(session, entity, entity, path, depth, callback);
            });
            return;
        }

        super.fetch(session, value, value, path, depth, callback);
    }

    fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!parentEntity) {
            return callback(new Error("Parent entity required to resolve inverse relationship."));
        }

        session.getPersister(this).findOneInverseOf(parentEntity, propertyName, (err, value) => {
            if(err) return callback(err);
            super.fetch(session, this, value, path, depth, callback);
        });
    }

    _resolveCore(context: ResolveContext): void {

        if(!context.isFirst) {
            context.setError("Unable to resolve entity mapping. The dot notation can only be used for embedded objects.")
            return;
        }

        super._resolveCore(context);
    }
}

export = EntityMapping;