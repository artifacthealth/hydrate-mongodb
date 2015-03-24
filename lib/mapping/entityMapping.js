var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ClassMapping = require("./classMapping");
var Reference = require("../reference");
var EntityMapping = (function (_super) {
    __extends(EntityMapping, _super);
    function EntityMapping(baseClass) {
        _super.call(this, baseClass);
        this.flags &= ~2048 /* Embeddable */;
        this.flags |= 1024 /* Entity */;
    }
    EntityMapping.prototype.setDocumentVersion = function (obj, version) {
        // TODO: escape versionField
        this.setDocumentVersion = (new Function("o", "v", "o['" + this.inheritanceRoot.versionField + "'] = v"));
        obj[this.inheritanceRoot.versionField] = version;
    };
    EntityMapping.prototype.getDocumentVersion = function (obj) {
        // TODO: escape versionField
        this.getDocumentVersion = (new Function("o", "return o['" + this.inheritanceRoot.versionField + "']"));
        return obj[this.inheritanceRoot.versionField];
    };
    EntityMapping.prototype.addIndex = function (index) {
        if (this.inheritanceRoot !== this) {
            this.inheritanceRoot.addIndex(index);
            return;
        }
        if (!this.indexes) {
            this.indexes = [];
        }
        this.indexes.push(index);
    };
    EntityMapping.prototype.refresh = function (context, entity, document) {
        var mapping = this.inheritanceRoot.getMapping(context, document);
        if (mapping) {
            if (mapping != this) {
                // http://jsperf.com/change-proto-on-class
                // http://stackoverflow.com/questions/23807805/why-is-mutating-the-prototype-of-an-object-bad-for-performance
                context.addError("Refresh does not support changing instantiated class of entity.");
                return;
            }
            return this.readObject(context, entity, document, true);
        }
    };
    EntityMapping.prototype.read = function (context, value) {
        var id;
        // if this is not the top level, the value should be the id
        if (context.path) {
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
        if (!this.inheritanceRoot.identity.validate(id)) {
            context.addError("'" + id.toString() + "' is not a valid identifier.", (context.path ? context.path + "." : "") + "_id");
            return;
        }
        // if this is not the top level
        if (context.path) {
            // TODO: confirm how we want to handle ObjectState.Removed.
            return context.session.getReferenceInternal(this, id);
        }
        var obj = _super.prototype.read.call(this, context, value);
        obj["_id"] = id;
        return obj;
    };
    EntityMapping.prototype.write = function (value, path, errors, visited) {
        var id;
        // Note that this.classConstructor could represent a base class since we are checking the id before looking up
        // the mapping for the current object in Class.write.
        // TODO: validate mapping that all classes inherit from inheritanceRoot or this ^ may not work
        // if the value is not an instance of the entity's constructor then it should be an identifier or DBRef
        if (Reference.isReference(value)) {
            // TODO: handle DBRef
            id = value.id;
        }
        else {
            // otherwise, retrieve the id from the object
            if (!(id = value["_id"])) {
                errors.push({ message: "Missing identifier.", path: (path ? path + "." : "") + "_id", value: value });
                return;
            }
        }
        if (!this.inheritanceRoot.identity.validate(id)) {
            errors.push({ message: "'" + id.toString() + "' is not a valid identifier.", path: (path ? path + "." : "") + "_id", value: id });
            return;
        }
        // if this is not the top level then just return a reference
        if (path) {
            // TODO: decide when to save reference as a DBRef
            return id;
        }
        var document = _super.prototype.write.call(this, value, path, errors, visited);
        if (document) {
            document["_id"] = id;
        }
        return document;
    };
    EntityMapping.prototype.watchEntity = function (entity, observer) {
        _super.prototype.watch.call(this, entity, observer, []);
    };
    EntityMapping.prototype.watch = function (value, observer, visited) {
        // Do nothing. Watch does not propagate to other entities.
    };
    EntityMapping.prototype.areDocumentsEqual = function (document1, document2) {
        return _super.prototype.areEqual.call(this, document1, document2);
    };
    EntityMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        var id1 = documentValue1["_id"] || documentValue1, id2 = documentValue2["_id"] || documentValue2;
        if (id1 === null || id1 === undefined || id2 === null || id2 === undefined) {
            return false;
        }
        return this.inheritanceRoot.identity.areEqual(id1, id2);
    };
    EntityMapping.prototype.walk = function (session, value, flags, entities, embedded, references) {
        if (!value || typeof value !== "object")
            return;
        if (Reference.isReference(value)) {
            // TODO: handle DBRef
            var entity = session.getObject(value.id);
            if (entity) {
                value = entity;
            }
            else {
                if (flags & 1024 /* Dereference */) {
                    // store reference to resolve later
                    references.push(value);
                }
                return;
            }
        }
        if (entities.indexOf(value) !== -1)
            return;
        entities.push(value);
        // If this isn't the first entity, only continue if we have the WalkEntities flag
        if ((this.flags & 512 /* WalkEntities */) == 0 && entities.length > 1)
            return;
        _super.prototype.walk.call(this, session, value, flags, entities, embedded, references);
    };
    EntityMapping.prototype.fetch = function (session, parentEntity, value, path, depth, callback) {
        var _this = this;
        if (!value || typeof value !== "object")
            return;
        if (Reference.isReference(value)) {
            // TODO: handle DBRef
            // We don't bother with the call to getObject here since fetch will call getObject. The reason we have the
            // separate call to getObject in 'walk' above is that walk only calls fetch if ProperFlags.Dereference is
            // passed in but should still include the object in the found entities if the object is managed.
            value.fetch(session, function (err, entity) {
                if (err)
                    return callback(err);
                _super.prototype.fetch.call(_this, session, entity, entity, path, depth, callback);
            });
            return;
        }
        _super.prototype.fetch.call(this, session, value, value, path, depth, callback);
    };
    EntityMapping.prototype.fetchInverse = function (session, parentEntity, propertyName, path, depth, callback) {
        var _this = this;
        if (!parentEntity) {
            return callback(new Error("Parent entity required to resolve inverse relationship."));
        }
        session.getPersister(this).findOneInverseOf(parentEntity, propertyName, function (err, value) {
            if (err)
                return callback(err);
            _super.prototype.fetch.call(_this, session, _this, value, path, depth, callback);
        });
    };
    EntityMapping.prototype._resolveCore = function (context) {
        if (!context.isFirst) {
            context.setError("Unable to resolve entity mapping. The dot notation can only be used for embedded objects.");
            return;
        }
        _super.prototype._resolveCore.call(this, context);
    };
    return EntityMapping;
})(ClassMapping);
module.exports = EntityMapping;
