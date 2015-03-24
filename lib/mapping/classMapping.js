var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ObjectMapping = require("./objectMapping");
var MappingRegistry = require("./mappingRegistry");
var ClassMapping = (function (_super) {
    __extends(ClassMapping, _super);
    /**
     * Constructs a ClassMapping.
     * @param baseClass The baseclass mapping for this class. If no baseclass is specified then it is assumed that this
     * mapping represents the inheritance root.
     */
    function ClassMapping(baseClass) {
        _super.call(this);
        this.flags |= 4 /* Class */;
        this._baseClass = baseClass;
        if (!baseClass) {
            this.flags |= 4096 /* InheritanceRoot */;
            this.inheritanceRoot = this;
        }
        else {
            var previous = baseClass;
            while (baseClass) {
                baseClass._addSubClass(this);
                previous = baseClass;
                baseClass = baseClass._baseClass;
            }
            this.inheritanceRoot = previous;
        }
    }
    ClassMapping.prototype.setDiscriminatorValue = function (value) {
        if (typeof value !== "string") {
            throw new Error("Expected string for discriminator value.");
        }
        this.discriminatorValue = value;
        this.inheritanceRoot._addDiscriminatorMapping(value, this);
    };
    ClassMapping.prototype.setDocumentDiscriminator = function (obj) {
        if (this.discriminatorValue === undefined) {
            this.setDocumentDiscriminator = (function () {
            });
            return;
        }
        // TODO: escape discriminatorField and discriminatorValue
        this.setDocumentDiscriminator = (new Function("o", "o['" + this.inheritanceRoot.discriminatorField + "'] = \"" + this.discriminatorValue + "\""));
        obj[this.inheritanceRoot.discriminatorField] = this.discriminatorValue;
    };
    ClassMapping.prototype.getDocumentDiscriminator = function (obj) {
        // TODO: escape discriminatorField
        this.getDocumentDiscriminator = (new Function("o", "return o['" + this.inheritanceRoot.discriminatorField + "']"));
        return obj[this.inheritanceRoot.discriminatorField];
    };
    Object.defineProperty(ClassMapping.prototype, "hasSubClasses", {
        get: function () {
            return this._subclasses && this._subclasses.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ClassMapping.prototype, "hasBaseClass", {
        get: function () {
            return this._baseClass !== undefined;
        },
        enumerable: true,
        configurable: true
    });
    ClassMapping.prototype._addSubClass = function (subclass) {
        if (!this._subclasses) {
            this._subclasses = [];
        }
        this._subclasses.push(subclass);
    };
    ClassMapping.prototype._addDiscriminatorMapping = function (value, mapping) {
        if (!this._discriminatorMap) {
            this._discriminatorMap = {};
        }
        if (this._discriminatorMap[value]) {
            throw new Error("There is already a class in this inheritance hierarchy with a discriminator value of '" + value + "'.");
        }
        this._discriminatorMap[value] = mapping;
    };
    ClassMapping.prototype._ensureRegistry = function () {
        if (!this._registry) {
            this._registry = new MappingRegistry();
            if (this._subclasses) {
                var subclasses = this._subclasses;
                for (var i = 0, l = subclasses.length; i < l; i++) {
                    this._registry.addMapping(subclasses[i]);
                }
            }
        }
        return this._registry;
    };
    ClassMapping.prototype.read = function (context, value) {
        var mapping = this.inheritanceRoot.getMapping(context, value);
        if (mapping) {
            return mapping.readClass(context, value);
        }
    };
    /**
     * Gets the mapping for the specified document. Note that this method can only be called on an inheritance root.
     * @param document The document.
     * @param path The current path. Used for error reporting.
     * @param errors An array of reported errors.
     */
    ClassMapping.prototype.getMapping = function (context, document) {
        var mapping = this._getMappingForDocument(document);
        if (mapping === undefined) {
            context.addError("Unknown discriminator value '" + this.getDocumentDiscriminator(document) + "'.");
            return;
        }
        return mapping;
    };
    ClassMapping.prototype._getMappingForDocument = function (document) {
        var discriminatorValue = this.getDocumentDiscriminator(document);
        return discriminatorValue === undefined ? this : this.inheritanceRoot._discriminatorMap[discriminatorValue];
    };
    ClassMapping.prototype.readClass = function (context, value) {
        return this.readObject(context, Object.create(this.classConstructor.prototype), value, false);
    };
    ClassMapping.prototype.write = function (value, path, errors, visited) {
        // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
        // does not exist, default to current mapping.
        return (this._ensureRegistry().getMappingForObject(value) || this).writeClass(value, path, errors, visited);
    };
    ClassMapping.prototype.writeClass = function (value, path, errors, visited) {
        var document = {};
        this.setDocumentDiscriminator(document);
        return this.writeObject(document, value, path, errors, visited);
    };
    ClassMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        var root = this.inheritanceRoot;
        var mapping1 = this._getMappingForDocument(documentValue1);
        var mapping2 = this._getMappingForDocument(documentValue2);
        // make sure both documents have the same mapping
        if (mapping1 === undefined || mapping2 === undefined || mapping1 !== mapping2) {
            return false;
        }
        return mapping1._areEqual(documentValue1, documentValue2);
    };
    ClassMapping.prototype._areEqual = function (documentValue1, documentValue2) {
        return _super.prototype.areEqual.call(this, documentValue1, documentValue2);
    };
    ClassMapping.prototype.walk = function (session, value, flags, entities, embedded, references) {
        if (!value || typeof value !== "object")
            return;
        return (this._ensureRegistry().getMappingForObject(value) || this)._walk(session, value, flags, entities, embedded, references);
    };
    ClassMapping.prototype._walk = function (session, value, flags, entities, embedded, references) {
        _super.prototype.walk.call(this, session, value, flags, entities, embedded, references);
    };
    ClassMapping.prototype.fetch = function (session, parentEntity, value, path, depth, callback) {
        if (!value || typeof value !== "object") {
            return callback(null, value);
        }
        return (this._ensureRegistry().getMappingForObject(value) || this)._fetch(session, parentEntity, value, path, depth, callback);
    };
    ClassMapping.prototype._fetch = function (session, parentEntity, value, path, depth, callback) {
        _super.prototype.fetch.call(this, session, parentEntity, value, path, depth, callback);
    };
    return ClassMapping;
})(ObjectMapping);
module.exports = ClassMapping;
