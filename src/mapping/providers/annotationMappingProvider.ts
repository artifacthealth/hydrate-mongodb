/// <reference path="../../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import Table = require("../../core/table");
import TableKey = require("../../core/tableKey");
import ResultCallback = require("../../core/resultCallback");
import Mapping = require("../mapping");
import MappingRegistry = require("../mappingRegistry");
import MappingProvider = require("./mappingProvider");
import ReflectHelper = require("../../core/ReflectHelper");
import Index = require("../index");
import IndexOptions = require("../../driver/indexOptions");
import Property = require("../property");
import PropertyFlags = require("../propertyFlags");
import ChangeTracking = require("../changeTracking");
import Map = require("../../core/map");
import MappingProviderOptions = require("../../config/mappingProviderOptions");

import ArrayMapping = require("../arrayMapping");
import BooleanMapping = require("../booleanMapping");
import ClassMapping = require("../classMapping");
import DateMapping = require("../dateMapping");
import EntityMapping = require("../entityMapping");
import EnumMapping = require("../enumMapping");
import NumberMapping = require("../numberMapping");
import ObjectMapping = require("../objectMapping");
import RegExpMapping = require("../regExpMapping");
import StringMapping = require("../stringMapping");
import TupleMapping = require("../tupleMapping");
import MappingFlags = require("../mappingFlags");

class AnnotationMappingProvider implements MappingProvider {

    private _filePaths: string[] = [];

    constructor(public config: MappingProviderOptions) {

    }

    addFile(path: string): void {

        this._filePaths.push(path);
    }

    // 1. Find all the classes that are annotated with "collection" or are a subclass of a class
    //    that is annotated with "collection"
    // 2. Recursively search types found in #1 to find all other object types. Make sure to only search
    //    declared fields so we are not duplicating searches from the parent type.
    // 3. Build type mapping. Mark properties as having an intrinsic type, embedded, or reference. It's a reference
    //    if it's a reference to a class that was found in #1. It's embedded if it's a reference to a type found in #2 or is an anonymous type

    // TODO: support UUID for _id in addition to ObjectID?  I believe it's universally unique just like ObjectID so shouldn't be a big deal to support.

    // TODO: any special mapping for enumerations? allowing changing persisted value, etc.

    // TODO: have a plan for supporting all these data types: http://docs.mongodb.org/manual/reference/bson-types/

     getMapping(callback: ResultCallback<MappingRegistry>): void {

        reflect.load(this._filePaths, (err, symbols) => {
            if(err) return callback(err);

            var builder = new MappingBuilder(this.config);
            var registry = builder.build(symbols);

            if(builder.hasErrors) {
                callback(new Error(builder.getErrorMessage()), null);
            }
            else {
                callback(null, registry);
            }
        });
    }
}

enum MappingKind {

    Entity,
    RootEntity,
    Embeddable,
    RootEmbeddable,
    Global
}

interface TypeLinks {

    type: reflect.Type;
    kind: MappingKind;
    mapping?: Mapping;
}

class MappingBuilder {

    private _objectTypes: reflect.Type[] = [];
    private _typeTable: Table<TypeLinks> = [];
    private _key = new TableKey();
    private _errors: string[] = [];
    private _registry = new MappingRegistry();

    constructor(public config: MappingProviderOptions) {

    }

    private _globalStringMapping = new StringMapping();
    private _globalNumberMapping = new NumberMapping();
    private _globalBooleanMapping = new BooleanMapping();
    private _globalDateMapping = new DateMapping();
    private _globalRegExpMapping = new RegExpMapping();

    build(symbols: reflect.Symbol[]): MappingRegistry {

        // create global mappings
        this._addGlobalMapping("String", this._globalStringMapping);
        this._addGlobalMapping("Number", this._globalNumberMapping);
        this._addGlobalMapping("Boolean", this._globalBooleanMapping);
        this._addGlobalMapping("Date", this._globalDateMapping);
        this._addGlobalMapping("RegExp", this._globalRegExpMapping);

        // find all entity types
        for(var i = 0, l = symbols.length; i < l; i++) {
            this._findClasses(symbols[i]);
        }

        this._ensureOneCollectionPerHierarchy();

        // TODO: identity supertypes as embeddable or entity. error on conflicts.
        // TODO: perhaps named types should be required to have @entity or @embeddable. how to handle multiple inheritance?
        // find all embedded types
        var objectTypes = this._objectTypes;
        for(var i = 0, l = objectTypes.length; i < l; i++) {
            this._scanPropertiesForEmbeddedTypes(objectTypes[i]);
        }

        // Create mappings. We need to create the mappings before we populate so we can create property mappings.
        for(var i = 0, l = objectTypes.length; i < l; i++) {
            var links = this._typeTable[this._key.ensureValue(objectTypes[i])];
            if(!links.mapping) {
                this._createMapping(links);
            }
        }

        // Populate mappings.
        for(var i = 0, l = objectTypes.length; i < l; i++) {
            this._populateMapping(this._typeTable[this._key.ensureValue(objectTypes[i])]);
        }

        return this._registry;
    }

    private _addGlobalMapping(name: string, mapping: Mapping): void {

        var type = reflect.resolve(name).getDeclaredType();
        this._typeTable[this._key.ensureValue(type)] = {
            type: type,
            mapping: mapping,
            kind: MappingKind.Global
        }
    }

    get hasErrors(): boolean {
        return this._errors.length > 0;
    }

    getErrorMessage(): string {
        return "Unable to build type mappings from declaration files:\n" + this._errors.join("\n");
    }

    private _findClasses(symbol: reflect.Symbol): void {

        if(symbol.isClass()) {
            var type = symbol.getDeclaredType();
            if(type.hasAnnotation("collection", true)) {
                this._addType(type, type.hasAnnotation("collection") ? MappingKind.RootEntity : MappingKind.Entity);
            }
            else if(type.hasAnnotation("embeddable", true)) {
                this._addType(type, type.hasAnnotation("embeddable") ? MappingKind.RootEmbeddable : MappingKind.Embeddable);
            }
        }

        var exports = symbol.getExports();
        for(var i = 0, l = exports.length; i < l; i++) {
            var symbol = exports[i];
            if(symbol.isClass() || symbol.isModule()) {
                this._findClasses(exports[i]);
            }
        }
    }

    private _scanPropertiesForEmbeddedTypes(type: reflect.Type): void {

        var properties = type.getProperties();
        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            if(property.isProperty()) {
                this._findEmbeddedTypes(property.getType());
            }
        }
    }

    private _findEmbeddedTypes(type: reflect.Type): void {

        if(!type.isObjectType() || ReflectHelper.isNativeType(type)) return;

        if(type.isClass() && !this._typeTable[this._key.ensureValue(type)]) {
            this._addError("Invalid type '"+ type.getFullName() +"'. All referenced classes must belong to an inheritance hierarchy annotated with 'collection' or 'embeddable'.");
        }

        if(this._typeTable[this._key.ensureValue(type)]) {
            return;
        }

        // TODO: handle scanning indexed types
        if(type.isArray()) {
            // note that any properties stored on an array type are not persisted, same with tuple
            this._findEmbeddedTypes(type.getElementType());
            return;
        }

        if(type.isTuple()) {
            var elementTypes = type.getElementTypes();
            for(var i = 0, l = elementTypes.length; i < l; i++) {
                this._findEmbeddedTypes(elementTypes[i]);
            }
            return;
        }

        this._addType(type, MappingKind.Embeddable);
        this._scanPropertiesForEmbeddedTypes(type);
    }

    private _addType(type: reflect.Type, kind: MappingKind): void {

        this._objectTypes.push(type);
        this._typeTable[this._key.ensureValue(type)] = {
            type: type,
            kind: kind
        }
    }

    private _ensureOneCollectionPerHierarchy(): void {

        var types = this._objectTypes;
        for(var i = 0, l = types.length; i < l; i++) {
            var type = types[i];
            if(this._subclassMarkedAsRootType(type)) {
                this._addAnnotationError(type, type.getAnnotations("collection")[0], "Only one class per inheritance hierarchy can have the 'collection' or 'embeddable' annotation.");
            }
        }
    }

    // Ryan x104

    private _subclassMarkedAsRootType(type: reflect.Type): boolean {

        var links = this._typeTable[this._key.ensureValue(type)];
        if(links.kind != MappingKind.RootEntity && links.kind != MappingKind.RootEmbeddable) {
            return false;
        }

        var baseClass = type.getBaseClass();
        while(baseClass) {
            var links = this._typeTable[this._key.ensureValue(type)];
            if(links.kind == MappingKind.RootEntity || links.kind == MappingKind.RootEmbeddable) {
                return true;
            }
            baseClass = baseClass.getBaseClass();
        }

        return false;
    }

    private _createMapping(links: TypeLinks): Mapping {

        var mapping: Mapping,
            type = links.type;

        switch(links.kind) {
            case MappingKind.RootEmbeddable:
                mapping = new ClassMapping();
                break;
            case MappingKind.Embeddable:
                if (type.isClass()) {
                    mapping = new ClassMapping(this._getParentMapping(type));
                }
                else {
                    mapping = new ObjectMapping();
                }
                break;
            case MappingKind.RootEntity:
                mapping = new EntityMapping();
                break;
            case MappingKind.Entity:
                var parentMapping = this._getParentMapping(type);
                if(parentMapping && (parentMapping.flags & MappingFlags.Entity) == 0) {
                    this._addError("Parent of mapping for '" + type.getFullName() + "' must be an entity mapping.");
                }
                mapping = new EntityMapping(<EntityMapping>parentMapping);
                break;
        }

        return links.mapping = mapping;
    }

    private _getParentMapping(type: reflect.Type): ClassMapping {

        var baseClass = type.getBaseClass();
        if(baseClass) {
            var links = this._typeTable[this._key.ensureValue(baseClass)];
            var mapping = links.mapping
            if(!mapping) {
                // If the mapping for the parent class does not exist, creat it
                mapping = this._createMapping(links);
                if(!mapping) {
                    this._addError("Error creating parent mapping for '" + type.getFullName() + "'.");
                    return undefined;
                }
            }

            if((mapping.flags & MappingFlags.Class) == 0) {
                this._addError("Parent of mapping for '" + type.getFullName() + "' must be a class mapping.");
                return undefined;
            }

            return <ClassMapping>links.mapping;
        }
    }

    private _populateMapping(links: TypeLinks) {

        if(links.mapping.flags & MappingFlags.Entity) {
            this._populateEntityMapping(<EntityMapping>links.mapping, links.type);
            return;
        }
        if(links.mapping.flags & MappingFlags.Class) {
            this._populateClassMapping(<ClassMapping>links.mapping, links.type);
            return;
        }
        if(links.mapping.flags & MappingFlags.Object) {
            this._populateObjectMapping(<ObjectMapping>links.mapping, links.type);
            return;
        }
    }

    private _populateEntityMapping(mapping: EntityMapping, type: reflect.Type): Mapping {

        // get type level annotations
        var annotations = type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
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
                    case "lockField":
                        this._setLockField(mapping, annotation.value);
                        break;
                    case "versioned":
                        this._setVersioned(mapping, annotation.value);
                        break;
                    case "lockable":
                        this._setVersioned(mapping, annotation.value);
                        break;
                    case "changeTracking":
                        this._setChangeTracking(mapping, annotation.value);
                        break;
                }
            }
            catch(e) {
                this._addAnnotationError(type, annotation, e.message);
            }
        }

        this._populateClassMapping(mapping, type);

        // add default values
        if (mapping.flags & MappingFlags.InheritanceRoot) {
            // TODO: global configuration for defaults

            if (!mapping.lockField) {
                mapping.lockField = "__l";
            }

            if (!mapping.versionField) {
                mapping.versionField = "__v";
            }

            if (!mapping.changeTracking) {
                mapping.changeTracking = ChangeTracking.DeferredImplicit;
            }

            if (!mapping.collectionName) {
                // TODO: configurable naming strategy for when name is not specified?
                mapping.collectionName = mapping.name;
            }

            // TODO: option to pass in default identity generator
            if(!mapping.identity) {
                mapping.identity = this.config.identityGenerator;
            }
        }

        return mapping;
    }

    private _populateClassMapping(mapping: ClassMapping, type: reflect.Type): Mapping {

        mapping.name = type.getName();
        mapping.classConstructor = type.getConstructor();

        // get type level annotations
        var annotations = type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
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
            catch(e) {
                this._addAnnotationError(type, annotation, e.message);
            }
        }

        // add default values
        if (mapping.flags & MappingFlags.InheritanceRoot) {
            // TODO: global configuration for defaults

            if (!mapping.discriminatorField) {
                mapping.discriminatorField = "__t";
            }
        }

        // if we are a document type and the the discriminatorValue is not set, default to the class name
        if (!mapping.discriminatorValue) {
            // TODO: configurable naming strategy for when discriminator field is not specified?
            mapping.setDiscriminatorValue(mapping.name);
        }

        this._registry.addMapping(mapping);

        return this._populateObjectMapping(mapping, type);
    }

    private _populateObjectMapping(mapping: ObjectMapping, type: reflect.Type): Mapping {

        // process all properties in the type
        var properties = type.getProperties();
        for(var i = 0, l = properties.length; i < l; i++) {
            var symbol = properties[i];
            if(!symbol.isProperty()) continue;
            try {
                var property = this._createProperty(mapping, type, symbol);
                // add to mapping after property has been fully initialized
                mapping.addProperty(property);
            }
            catch(e) {
                this._addError("Invalid property '" + property.name + "' on type '" + type.getFullName() + "': " + e.message);
            }
        }

        // TODO: handle what addDefaultMapping did
        //mapping.addDefaultMappings(this.config);
        return mapping;
    }

    private _createProperty(mapping: Mapping, parentType: reflect.Type, symbol: reflect.Symbol): Property {

        var property = new Property(symbol.getName());
        try {
            property.mapping = this._createPropertyMapping(symbol.getType());
        }
        catch(e) {
            this._addError("Error creating property '" + property.name + "' of type '" + parentType.getFullName() + "': " + e.message);
        }

        // process all property annotations
        var annotations = symbol.getAnnotations(),
            indexAnnotations: reflect.Annotation[];

        try {
            for (var i = 0, l = annotations.length; i < l; i++) {
                var annotation = annotations[i];

                switch (annotation.name) {
                    case "transient":
                        property.setFlags(PropertyFlags.Ignored);
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
        if(!property.field && !(property.flags & PropertyFlags.Ignored)) {
            // TODO: configurable naming strategy for when name is not specified?
            property.field = property.name;
        }

        // after all annotations are processed and default mappings are set, add any property indexes
        if(indexAnnotations) {
            try {
                for (var i = 0, l = indexAnnotations.length; i < l; i++) {
                    var annotation = indexAnnotations[i];
                    this._addPropertyIndex(<EntityMapping>mapping, property, indexAnnotations[i].value);
                }
            }
            catch (e) {
                this._addPropertyAnnotationError(parentType, property, annotation, e.message);
            }
        }

        return property;
    }

    private _createPropertyMapping(type: reflect.Type): Mapping {

        var links = this._typeTable[this._key.ensureValue(type)];
        if(links && links.mapping) {
            return links.mapping;
        }

        if(type.isAny()) {
            throw new Error("'Any' type is not supported.");
        }

        if(type.isNumber()) {
            return this._globalNumberMapping;
        }
        if(type.isBoolean()) {
            return this._globalBooleanMapping;
        }
        if(type.isString()) {
            return this._globalStringMapping;
        }

        if(type.isArray()) {
            return new ArrayMapping(this._createPropertyMapping(type.getElementType()));
        }

        if(type.isTuple()) {
            return new TupleMapping(type.getElementTypes().map(type => this._createPropertyMapping(type)));
        }

        if(type.isEnum()) {
            var names = type.getEnumNames(),
                members: Map<number> = {};
            for(var i = 0, l = names.length; i < l; i++) {
                var name = names[i];
                members[name] = type.getEnumValue(name);
            }
            return new EnumMapping(members);
        }

        // This should never happen
        throw new Error("Unable to create mapping for '" + type.getFullName() + "'.");
    }

    private _createEnumMapping(type: reflect.Type): EnumMapping {

        return null;
    }

    private _setCollection(mapping: EntityMapping, value: any): void {

        if(typeof value === "string") {
            mapping.collectionName = value;
        }
        else {
            if(value.name) {
                if(typeof value.name !== "string") {
                    throw new Error("Property 'name' should be of type string.")
                }
                mapping.collectionName = value.name;
            }

            mapping.collectionOptions = value.options;
            // TODO: validate options

            if(value.db) {
                if(typeof value.db !== "string") {
                    throw new Error("Property 'db' should be of type string.");
                }
                else {
                    mapping.databaseName = value.db;
                }
            }
        }
    }

    private _addIndex(mapping: EntityMapping, value: any): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);

        if(!value.keys) {
            throw new Error("Missing require property 'keys'.");
        }

        // TODO: validate index options

        // TODO: validate index keys
        mapping.addIndex(value);
    }

    private _addPropertyIndex(mapping: EntityMapping, property: Property, value: any): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);

        var keys: Map<number> = {};
        var options: IndexOptions;

        if(typeof value === "boolean") {
            keys[property.field] = 1;
        }
        else {
            var order: number;
            if(value.order !== undefined) {
                if(typeof value.order !== "number") {
                    throw new Error("Property 'order' should be of type number.");
                }
                order = value.order;
                if(order != 1 && order != -1) {
                    throw new Error("Valid values for property 'order' are 1 or -1.");
                }
                // TODO: 'order' property should not be passed in options object. When we validate options in the future, this will throw an error.
                // However, we can't just delete it from the project because then that removes it from the annotation as well and subsequent
                // processing of the annotation would then not have the order value. Instead we should copy properties from the annotation value
                // to the index options.
            }
            else {
                order = 1;
            }
            keys[property.field] = order;
            options = value;
        }

        this._addIndex(mapping, {
            keys: keys,
            options: options
        });

    }

    private _setDiscriminatorField(mapping: ClassMapping, value: any): void {

        this._assertRootClassMapping(mapping);
        this._assertString(value);

        mapping.discriminatorField = value;
    }

    private _setDiscriminatorValue(mapping: ClassMapping, value: any): void {

        this._assertClassMapping(mapping);
        this._assertString(value);

        mapping.setDiscriminatorValue(value);
    }

    private _setVersioned(mapping: EntityMapping, value: any): void {

        this._assertRootEntityMapping(mapping);

        if(value === undefined) {
            mapping.versioned = true;
        }
        else {
            this._assertBoolean(value);
            mapping.versioned = value;
        }
    }

    private _setLockable(mapping: EntityMapping, value: any): void {

        this._assertRootEntityMapping(mapping);

        if(value === undefined) {
            mapping.lockable = true;
        }
        else {
            this._assertBoolean(value);
            mapping.lockable = value;
        }
    }

    private _setVersionField(mapping: EntityMapping, value: any): void {

        this._assertRootEntityMapping(mapping);
        this._assertString(value);

        mapping.versionField = value;
        mapping.versioned = true;
    }

    private _setLockField(mapping: EntityMapping, value: any): void {

        this._assertRootEntityMapping(mapping);
        this._assertString(mapping);

        mapping.lockField = value;
        mapping.lockable = true;
    }

    private _setChangeTracking(mapping: EntityMapping, value: any): void {

        this._assertRootEntityMapping(mapping);
        this._assertString(mapping);

        switch(value.toLowerCase()) {
            case "deferredimplicit":
                mapping.changeTracking = ChangeTracking.DeferredImplicit;
                break;
            case "deferredexplicit":
                mapping.changeTracking = ChangeTracking.DeferredExplicit;
                break;
            case "notify":
                mapping.changeTracking = ChangeTracking.Notify;
                break;
            default:
                throw new Error("Unknown change tracking policy: " + value);
        }
    }

    private _setCascade(property: Property, value: any): void {

        if(value === undefined) {
            throw new Error("Type of cascade must be specified.");
        }

        if(typeof value !== "string") {
            throw new Error("Value must be of type string.")
        }

        var cascades = value.split(",");
        for(var i = 0, l = cascades.length; i < l; i++) {
            var cascade = cascades[i].trim().toLowerCase();
            switch(cascade) {
                case "all":
                    property.setFlags(PropertyFlags.CascadeAll);
                    break;
                case "save":
                    property.setFlags(PropertyFlags.CascadeSave);
                    break;
                case "remove":
                    property.setFlags(PropertyFlags.CascadeRemove);
                    break;
                case "detach":
                    property.setFlags(PropertyFlags.CascadeDetach);
                    break;
            }
        }
    }

    private _setField(property: Property, value: any): void {

        if(typeof value === "string") {
            property.field = value;
        }
        else {
            if(value.name) {
                if(typeof value.name !== "string") {
                    throw new Error("Property 'name' should be of type string.")
                }
                property.field = value.name;
            }
            if(value.nullable) {
                property.setFlags(PropertyFlags.Nullable);
            }
        }
    }

    private _setInverse(property: Property, value: any): void {

        if(value === undefined) {
            throw new Error("The name of the field in the target class must be specified that represents the inverse relationship.");
        }

        if(typeof value !== "string") {
            throw new Error("Value must be of type string.")
        }

        // TODO: validate inverse relationship
        property.inverseOf = value;
        property.setFlags(PropertyFlags.InverseSide);
    }


    private _assertEntityMapping(mapping: Mapping): void {

        if(!(mapping.flags & MappingFlags.Entity)) {
            throw new Error("Annotation can only be defined on entities.");
        }
    }

    private _assertRootEntityMapping(mapping: Mapping): void {

        this._assertEntityMapping(mapping);
        this._assertRootClassMapping(mapping);
    }

    private _assertClassMapping(mapping: Mapping): void {

        if(!(mapping.flags & MappingFlags.Class)) {
            throw new Error("Annotation can only be defined on class mappings.");
        }
    }

    private _assertRootClassMapping(mapping: Mapping): void {

        this._assertClassMapping(mapping);

        var classMapping = <ClassMapping>mapping;
        if(!(classMapping.flags & MappingFlags.InheritanceRoot)) {
            throw new Error("Annotation can only be defined on classes that are the root of a mapped inheritance hierarchy.");
        }
    }

    private _assertString(value: any): void {

        if(typeof value !== "string") {
            throw new Error("Value must be of type string.");
        }
    }

    private _assertBoolean(value: any): void {

        if(typeof value !== "boolean") {
            throw new Error("Value must be of type boolean.");
        }
    }

    private _addAnnotationError(type: reflect.Type, annotation: reflect.Annotation, message: string): void {

        this._addError(annotation.getDeclarationFileName() + ": Invalid annotation '" + annotation.name + "' on '" + type.getFullName() + "': " + message);
    }

    private _addPropertyAnnotationError(type: reflect.Type, property: Property, annotation: reflect.Annotation, message: string): void {

        this._addError(annotation.getDeclarationFileName() + ": Invalid annotation '" + annotation.name + "' on property '" + property.name + "' of type '" + type.getFullName() + "': " + message);
    }

    private _addError(message: string): void {

        this._errors.push(message);
    }
}

export = AnnotationMappingProvider;