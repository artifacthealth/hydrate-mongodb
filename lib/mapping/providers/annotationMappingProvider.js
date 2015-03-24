var reflect = require("tsreflect");
var TableKey = require("../../core/tableKey");
var ChangeTracking = require("../changeTracking");
var Mapping = require("../mapping");
var AnnotationMappingProvider = (function () {
    function AnnotationMappingProvider() {
        this._filePaths = [];
    }
    AnnotationMappingProvider.prototype.addFile = function (path) {
        this._filePaths.push(path);
    };
    // 1. Find all the classes that are annotated with "collection" or are a subclass of a class
    //    that is annotated with "collection"
    // 2. Recursively search types found in #1 to find all other object types. Make sure to only search
    //    declared fields so we are not duplicating searches from the parent type.
    // 3. Build type mapping. Mark properties as having an intrinsic type, embedded, or reference. It's a reference
    //    if it's a reference to a class that was found in #1. It's embedded if it's a reference to a type found in #2 or is an anonymous type
    // TODO: support UUID for _id in addition to ObjectID?  I believe it's universally unique just like ObjectID so shouldn't be a big deal to support.
    // TODO: any special mapping for enumerations? allowing changing persisted value, etc.
    // TODO: have a plan for supporting all these data types: http://docs.mongodb.org/manual/reference/bson-types/
    AnnotationMappingProvider.prototype.getMapping = function (config, callback) {
        var context = reflect.createContext();
        context.load(this._filePaths, function (err, symbols) {
            if (err)
                return callback(err);
            var builder = new MappingBuilder(config, context);
            var mappings = builder.build(symbols);
            if (builder.hasErrors) {
                callback(new Error(builder.getErrorMessage()), null);
            }
            else {
                callback(null, mappings);
            }
        });
    };
    return AnnotationMappingProvider;
})();
var MappingKind;
(function (MappingKind) {
    MappingKind[MappingKind["Entity"] = 0] = "Entity";
    MappingKind[MappingKind["RootEntity"] = 1] = "RootEntity";
    MappingKind[MappingKind["Embeddable"] = 2] = "Embeddable";
    MappingKind[MappingKind["RootEmbeddable"] = 3] = "RootEmbeddable";
    MappingKind[MappingKind["Global"] = 4] = "Global";
})(MappingKind || (MappingKind = {}));
var MappingBuilder = (function () {
    function MappingBuilder(config, context) {
        this.config = config;
        this._objectTypes = [];
        this._typeTable = [];
        this._key = new TableKey();
        this._errors = [];
        this._mappings = [];
        this._globalStringMapping = Mapping.createStringMapping();
        this._globalNumberMapping = Mapping.createNumberMapping();
        this._globalBooleanMapping = Mapping.createBooleanMapping();
        this._globalDateMapping = Mapping.createDateMapping();
        this._globalRegExpMapping = Mapping.createRegExpMapping();
        this._context = context;
    }
    MappingBuilder.prototype.build = function (symbols) {
        // create global mappings
        this._addGlobalMapping("String", this._globalStringMapping);
        this._addGlobalMapping("Number", this._globalNumberMapping);
        this._addGlobalMapping("Boolean", this._globalBooleanMapping);
        this._addGlobalMapping("Date", this._globalDateMapping);
        this._addGlobalMapping("RegExp", this._globalRegExpMapping);
        for (var i = 0, l = symbols.length; i < l; i++) {
            this._findClasses(symbols[i]);
        }
        this._ensureOneCollectionPerHierarchy();
        // TODO: identity supertypes as embeddable or entity. error on conflicts.
        // TODO: perhaps named types should be required to have @entity or @embeddable. how to handle multiple inheritance?
        // find all embedded types
        var objectTypes = this._objectTypes;
        for (var i = 0, l = objectTypes.length; i < l; i++) {
            this._scanPropertiesForEmbeddedTypes(objectTypes[i]);
        }
        for (var i = 0, l = objectTypes.length; i < l; i++) {
            var links = this._typeTable[this._key.ensureValue(objectTypes[i])];
            if (!links.mapping) {
                this._createMapping(links);
            }
        }
        for (var i = 0, l = objectTypes.length; i < l; i++) {
            this._populateMapping(this._typeTable[this._key.ensureValue(objectTypes[i])]);
        }
        return this._mappings;
    };
    MappingBuilder.prototype._addGlobalMapping = function (name, mapping) {
        var type = this._context.resolve(name).getDeclaredType();
        this._typeTable[this._key.ensureValue(type)] = {
            type: type,
            mapping: mapping,
            kind: 4 /* Global */
        };
    };
    Object.defineProperty(MappingBuilder.prototype, "hasErrors", {
        get: function () {
            return this._errors.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    MappingBuilder.prototype.getErrorMessage = function () {
        return "Unable to build type mappings from declaration files:\n" + this._errors.join("\n");
    };
    MappingBuilder.prototype._findClasses = function (symbol) {
        if (symbol.isClass()) {
            var type = symbol.getDeclaredType();
            if (type.hasAnnotation("collection", true)) {
                this._addType(type, type.hasAnnotation("collection") ? 1 /* RootEntity */ : 0 /* Entity */);
            }
            else if (type.hasAnnotation("embeddable", true)) {
                this._addType(type, type.hasAnnotation("embeddable") ? 3 /* RootEmbeddable */ : 2 /* Embeddable */);
            }
        }
        var exports = symbol.getExports();
        for (var i = 0, l = exports.length; i < l; i++) {
            var symbol = exports[i];
            if (symbol.isClass() || symbol.isModule()) {
                this._findClasses(exports[i]);
            }
        }
    };
    MappingBuilder.prototype._scanPropertiesForEmbeddedTypes = function (type) {
        var properties = type.getProperties();
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            if (property.isProperty()) {
                this._findEmbeddedTypes(property.getType());
            }
        }
    };
    MappingBuilder.prototype._findEmbeddedTypes = function (type) {
        if (!type.isObjectType() || this._isNativeType(type))
            return;
        if (type.isClass() && !this._typeTable[this._key.ensureValue(type)]) {
            this._addError("Invalid type '" + type.getFullName() + "'. All referenced classes must belong to an inheritance hierarchy annotated with 'collection' or 'embeddable'.");
        }
        if (this._typeTable[this._key.ensureValue(type)]) {
            return;
        }
        // TODO: handle scanning indexed types
        if (type.isArray()) {
            // note that any properties stored on an array type are not persisted, same with tuple
            this._findEmbeddedTypes(type.getElementType());
            return;
        }
        if (type.isTuple()) {
            var elementTypes = type.getElementTypes();
            for (var i = 0, l = elementTypes.length; i < l; i++) {
                this._findEmbeddedTypes(elementTypes[i]);
            }
            return;
        }
        this._addType(type, 2 /* Embeddable */);
        this._scanPropertiesForEmbeddedTypes(type);
    };
    MappingBuilder.prototype._addType = function (type, kind) {
        this._objectTypes.push(type);
        this._typeTable[this._key.ensureValue(type)] = {
            type: type,
            kind: kind
        };
    };
    MappingBuilder.prototype._ensureOneCollectionPerHierarchy = function () {
        var types = this._objectTypes;
        for (var i = 0, l = types.length; i < l; i++) {
            var type = types[i];
            if (this._subclassMarkedAsRootType(type)) {
                this._addAnnotationError(type, type.getAnnotations("collection")[0], "Only one class per inheritance hierarchy can have the 'collection' or 'embeddable' annotation.");
            }
        }
    };
    MappingBuilder.prototype._subclassMarkedAsRootType = function (type) {
        var links = this._typeTable[this._key.ensureValue(type)];
        if (links.kind != 1 /* RootEntity */ && links.kind != 3 /* RootEmbeddable */) {
            return false;
        }
        var baseClass = type.getBaseClass();
        while (baseClass) {
            var links = this._typeTable[this._key.ensureValue(type)];
            if (links.kind == 1 /* RootEntity */ || links.kind == 3 /* RootEmbeddable */) {
                return true;
            }
            baseClass = baseClass.getBaseClass();
        }
        return false;
    };
    MappingBuilder.prototype._createMapping = function (links) {
        var mapping, type = links.type;
        switch (links.kind) {
            case 3 /* RootEmbeddable */:
                mapping = Mapping.createClassMapping();
                break;
            case 2 /* Embeddable */:
                if (type.isClass()) {
                    mapping = Mapping.createClassMapping(this._getParentMapping(type));
                }
                else {
                    mapping = Mapping.createObjectMapping();
                }
                break;
            case 1 /* RootEntity */:
                mapping = Mapping.createEntityMapping();
                break;
            case 0 /* Entity */:
                var parentMapping = this._getParentMapping(type);
                if (parentMapping && (parentMapping.flags & 1024 /* Entity */) == 0) {
                    this._addError("Parent of mapping for '" + type.getFullName() + "' must be an entity mapping.");
                }
                mapping = Mapping.createEntityMapping(parentMapping);
                break;
        }
        return links.mapping = mapping;
    };
    MappingBuilder.prototype._getParentMapping = function (type) {
        var baseClass = type.getBaseClass();
        if (baseClass) {
            var links = this._typeTable[this._key.ensureValue(baseClass)];
            var mapping = links.mapping;
            if (!mapping) {
                // If the mapping for the parent class does not exist, creat it
                mapping = this._createMapping(links);
                if (!mapping) {
                    this._addError("Error creating parent mapping for '" + type.getFullName() + "'.");
                    return undefined;
                }
            }
            if ((mapping.flags & 4 /* Class */) == 0) {
                this._addError("Parent of mapping for '" + type.getFullName() + "' must be a class mapping.");
                return undefined;
            }
            return links.mapping;
        }
    };
    MappingBuilder.prototype._populateMapping = function (links) {
        if (links.mapping.flags & 1024 /* Entity */) {
            this._populateEntityMapping(links.mapping, links.type);
            return;
        }
        if (links.mapping.flags & 4 /* Class */) {
            this._populateClassMapping(links.mapping, links.type);
            return;
        }
        if (links.mapping.flags & 64 /* Object */) {
            this._populateObjectMapping(links.mapping, links.type);
            return;
        }
    };
    MappingBuilder.prototype._populateEntityMapping = function (mapping, type) {
        // get type level annotations
        var annotations = type.getAnnotations();
        for (var i = 0, l = annotations.length; i < l; i++) {
            var annotation = annotations[i];
            try {
                switch (annotation.name) {
                    case "collection":
                        this._setCollection(mapping, annotation.value);
                        break;
                    case "index":
                        this._addIndex(mapping, annotation.value);
                        break;
                    case "versionField":
                        this._setVersionField(mapping, annotation.value);
                        break;
                    case "versioned":
                        this._setVersioned(mapping, annotation.value);
                        break;
                    case "changeTracking":
                        this._setChangeTracking(mapping, annotation.value);
                        break;
                }
            }
            catch (e) {
                this._addAnnotationError(type, annotation, e.message);
            }
        }
        this._populateClassMapping(mapping, type);
        // add default values
        if (mapping.flags & 4096 /* InheritanceRoot */) {
            if (mapping.versioned == null) {
                mapping.versioned = this.config.versioned;
            }
            if (mapping.versionField == null) {
                mapping.versionField = this.config.versionField;
            }
            if (mapping.changeTracking == null) {
                mapping.changeTracking = this.config.changeTracking;
            }
            if (mapping.collectionName == null) {
                mapping.collectionName = this.config.collectionNamingStrategy(mapping.name);
            }
            if (mapping.identity == null) {
                mapping.identity = this.config.identityGenerator;
            }
        }
        return mapping;
    };
    MappingBuilder.prototype._populateClassMapping = function (mapping, type) {
        mapping.name = type.getName();
        mapping.classConstructor = type.getConstructor();
        // get type level annotations
        var annotations = type.getAnnotations();
        for (var i = 0, l = annotations.length; i < l; i++) {
            var annotation = annotations[i];
            try {
                switch (annotation.name) {
                    case "discriminatorField":
                        this._setDiscriminatorField(mapping, annotation.value);
                        break;
                    case "discriminatorValue":
                        this._setDiscriminatorValue(mapping, annotation.value);
                        break;
                }
            }
            catch (e) {
                this._addAnnotationError(type, annotation, e.message);
            }
        }
        // add default values
        if (mapping.flags & 4096 /* InheritanceRoot */) {
            if (!mapping.discriminatorField) {
                mapping.discriminatorField = this.config.discriminatorField;
            }
        }
        // if we are a document type and the the discriminatorValue is not set, default to the class name
        if (!mapping.discriminatorValue && (mapping.hasBaseClass || mapping.hasSubClasses)) {
            mapping.setDiscriminatorValue(this.config.discriminatorNamingStrategy(mapping.name));
        }
        this._mappings.push(mapping);
        return this._populateObjectMapping(mapping, type);
    };
    MappingBuilder.prototype._populateObjectMapping = function (mapping, type) {
        // process all properties in the type
        var properties = type.getProperties();
        for (var i = 0, l = properties.length; i < l; i++) {
            var symbol = properties[i];
            if (!symbol.isProperty())
                continue;
            try {
                var property = this._createProperty(mapping, type, symbol);
                // add to mapping after property has been fully initialized
                mapping.addProperty(property);
            }
            catch (e) {
                this._addError("Invalid property '" + property.name + "' on type '" + type.getFullName() + "': " + e.message);
            }
        }
        // TODO: handle what addDefaultMapping did
        //mapping.addDefaultMappings(this.config);
        return mapping;
    };
    MappingBuilder.prototype._createProperty = function (mapping, parentType, symbol) {
        var name = symbol.getName();
        try {
            var propertyMapping = this._createPropertyMapping(symbol.getType());
        }
        catch (e) {
            this._addError("Error creating property '" + name + "' of type '" + parentType.getFullName() + "': " + e.message);
        }
        var property = Mapping.createProperty(name, propertyMapping);
        // process all property annotations
        var annotations = symbol.getAnnotations(), indexAnnotations;
        try {
            for (var i = 0, l = annotations.length; i < l; i++) {
                var annotation = annotations[i];
                switch (annotation.name) {
                    case "transient":
                        property.setFlags(1 /* Ignored */);
                        break;
                    case "cascade":
                        this._setCascade(property, annotation.value);
                        break;
                    case "field":
                        this._setField(property, annotation.value);
                        break;
                    case "index":
                        // queue up index annotations until after all annotations are processed and default mappings
                        // are applied because we may not know the field name yet.
                        (indexAnnotations || (indexAnnotations = [])).push(annotation);
                        break;
                    case "inverse":
                        this._setInverse(property, annotation.value);
                        break;
                }
            }
        }
        catch (e) {
            this._addPropertyAnnotationError(parentType, property, annotation, e.message);
        }
        // add default values
        if (!property.field && !(property.flags & 1 /* Ignored */)) {
            property.field = this.config.fieldNamingStrategy(property.name);
        }
        // after all annotations are processed and default mappings are set, add any property indexes
        if (indexAnnotations) {
            try {
                for (var i = 0, l = indexAnnotations.length; i < l; i++) {
                    var annotation = indexAnnotations[i];
                    this._addPropertyIndex(mapping, property, indexAnnotations[i].value);
                }
            }
            catch (e) {
                this._addPropertyAnnotationError(parentType, property, annotation, e.message);
            }
        }
        return property;
    };
    MappingBuilder.prototype._createPropertyMapping = function (type) {
        var _this = this;
        var links = this._typeTable[this._key.ensureValue(type)];
        if (links && links.mapping) {
            return links.mapping;
        }
        if (type.isAny()) {
            throw new Error("'Any' type is not supported.");
        }
        if (type.isNumber()) {
            return this._globalNumberMapping;
        }
        if (type.isBoolean()) {
            return this._globalBooleanMapping;
        }
        if (type.isString()) {
            return this._globalStringMapping;
        }
        if (type.isArray()) {
            return Mapping.createArrayMapping(this._createPropertyMapping(type.getElementType()));
        }
        if (type.isTuple()) {
            return Mapping.createTupleMapping(type.getElementTypes().map(function (type) { return _this._createPropertyMapping(type); }));
        }
        if (type.isEnum()) {
            var names = type.getEnumNames(), members = {};
            for (var i = 0, l = names.length; i < l; i++) {
                var name = names[i];
                members[name] = type.getEnumValue(name);
            }
            return Mapping.createEnumMapping(members);
        }
        throw new Error("Unable to create mapping for '" + type.getFullName() + "'.");
    };
    MappingBuilder.prototype._setCollection = function (mapping, value) {
        if (typeof value === "string") {
            mapping.collectionName = value;
        }
        else {
            if (value.name) {
                if (typeof value.name !== "string") {
                    throw new Error("Property 'name' should be of type string.");
                }
                mapping.collectionName = value.name;
            }
            mapping.collectionOptions = value.options;
            // TODO: validate options
            if (value.db) {
                if (typeof value.db !== "string") {
                    throw new Error("Property 'db' should be of type string.");
                }
                else {
                    mapping.databaseName = value.db;
                }
            }
        }
    };
    MappingBuilder.prototype._addIndex = function (mapping, value) {
        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);
        if (!value.keys) {
            throw new Error("Missing require property 'keys'.");
        }
        // TODO: validate index options
        // TODO: validate index keys
        mapping.addIndex(value);
    };
    MappingBuilder.prototype._addPropertyIndex = function (mapping, property, value) {
        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);
        var keys = [];
        var options;
        if (typeof value === "boolean") {
            keys.push([property.field, 1]);
        }
        else {
            var order;
            if (value.order !== undefined) {
                if (typeof value.order !== "number") {
                    throw new Error("Property 'order' should be of type number.");
                }
                order = value.order;
                if (order != 1 && order != -1) {
                    throw new Error("Valid values for property 'order' are 1 or -1.");
                }
            }
            else {
                order = 1;
            }
            keys.push([property.field, order]);
            options = value;
        }
        this._addIndex(mapping, {
            keys: keys,
            options: options
        });
    };
    MappingBuilder.prototype._setDiscriminatorField = function (mapping, value) {
        this._assertRootClassMapping(mapping);
        this._assertString(value);
        mapping.discriminatorField = value;
    };
    MappingBuilder.prototype._setDiscriminatorValue = function (mapping, value) {
        this._assertClassMapping(mapping);
        this._assertString(value);
        mapping.setDiscriminatorValue(value);
    };
    MappingBuilder.prototype._setVersioned = function (mapping, value) {
        this._assertRootEntityMapping(mapping);
        if (value === undefined) {
            mapping.versioned = true;
        }
        else {
            this._assertBoolean(value);
            mapping.versioned = value;
        }
    };
    MappingBuilder.prototype._setVersionField = function (mapping, value) {
        this._assertRootEntityMapping(mapping);
        this._assertString(value);
        mapping.versionField = value;
        mapping.versioned = true;
    };
    MappingBuilder.prototype._setChangeTracking = function (mapping, value) {
        this._assertRootEntityMapping(mapping);
        this._assertString(value);
        switch (value.toLowerCase()) {
            case "deferredimplicit":
                mapping.changeTracking = 0 /* DeferredImplicit */;
                break;
            case "deferredexplicit":
                mapping.changeTracking = 1 /* DeferredExplicit */;
                break;
            case "observe":
                mapping.changeTracking = 2 /* Observe */;
                break;
            default:
                throw new Error("Unknown change tracking policy: " + value);
        }
    };
    MappingBuilder.prototype._setCascade = function (property, value) {
        if (value === undefined) {
            throw new Error("Type of cascade must be specified.");
        }
        if (typeof value !== "string") {
            throw new Error("Value must be of type string.");
        }
        var cascades = value.split(",");
        for (var i = 0, l = cascades.length; i < l; i++) {
            var cascade = cascades[i].trim().toLowerCase();
            switch (cascade) {
                case "all":
                    property.setFlags(62 /* CascadeAll */);
                    break;
                case "save":
                    property.setFlags(2 /* CascadeSave */);
                    break;
                case "remove":
                    property.setFlags(4 /* CascadeRemove */);
                    break;
                case "detach":
                    property.setFlags(8 /* CascadeDetach */);
                    break;
            }
        }
    };
    MappingBuilder.prototype._setField = function (property, value) {
        if (typeof value === "string") {
            property.field = value;
        }
        else {
            if (value.name) {
                if (typeof value.name !== "string") {
                    throw new Error("Property 'name' should be of type string.");
                }
                property.field = value.name;
            }
            if (value.nullable) {
                property.setFlags(128 /* Nullable */);
            }
        }
    };
    MappingBuilder.prototype._setInverse = function (property, value) {
        if (value === undefined) {
            throw new Error("The name of the field in the target class must be specified that represents the inverse relationship.");
        }
        if (typeof value !== "string") {
            throw new Error("Value must be of type string.");
        }
        // TODO: validate inverse relationship
        property.inverseOf = value;
        property.setFlags(64 /* InverseSide */);
    };
    MappingBuilder.prototype._assertEntityMapping = function (mapping) {
        if (!(mapping.flags & 1024 /* Entity */)) {
            throw new Error("Annotation can only be defined on entities.");
        }
    };
    MappingBuilder.prototype._assertRootEntityMapping = function (mapping) {
        this._assertEntityMapping(mapping);
        this._assertRootClassMapping(mapping);
    };
    MappingBuilder.prototype._assertClassMapping = function (mapping) {
        if (!(mapping.flags & 4 /* Class */)) {
            throw new Error("Annotation can only be defined on class mappings.");
        }
    };
    MappingBuilder.prototype._assertRootClassMapping = function (mapping) {
        this._assertClassMapping(mapping);
        var classMapping = mapping;
        if (!(classMapping.flags & 4096 /* InheritanceRoot */)) {
            throw new Error("Annotation can only be defined on classes that are the root of a mapped inheritance hierarchy.");
        }
    };
    MappingBuilder.prototype._assertString = function (value) {
        if (typeof value !== "string") {
            throw new Error("Value must be of type string.");
        }
    };
    MappingBuilder.prototype._assertBoolean = function (value) {
        if (typeof value !== "boolean") {
            throw new Error("Value must be of type boolean.");
        }
    };
    MappingBuilder.prototype._addAnnotationError = function (type, annotation, message) {
        this._addError(annotation.getDeclarationFileName() + ": Invalid annotation '" + annotation.name + "' on '" + type.getFullName() + "': " + message);
    };
    MappingBuilder.prototype._addPropertyAnnotationError = function (type, property, annotation, message) {
        this._addError(annotation.getDeclarationFileName() + ": Invalid annotation '" + annotation.name + "' on property '" + property.name + "' of type '" + type.getFullName() + "': " + message);
    };
    MappingBuilder.prototype._addError = function (message) {
        this._errors.push(message);
    };
    MappingBuilder.prototype._isDate = function (type) {
        if (this._globalDateType === undefined) {
            this._globalDateType = this._context.resolve("Date").getDeclaredType();
        }
        return this._globalDateType === type;
    };
    MappingBuilder.prototype._isRegExp = function (type) {
        if (this._globalRegExpType === undefined) {
            this._globalRegExpType = this._context.resolve("RegExp").getDeclaredType();
        }
        return this._globalRegExpType === type;
    };
    MappingBuilder.prototype._isNativeType = function (type) {
        return this._isDate(type) || this._isRegExp(type);
    };
    return MappingBuilder;
})();
module.exports = AnnotationMappingProvider;
