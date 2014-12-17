/// <reference path="../../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import ResultCallback = require("../../resultCallback");
import TypeMapping = require("../typeMapping");
import Property = require("../property");
import MappingProvider = require("./MappingProvider");
import ReflectHelper = require("../../ReflectHelper");
import Index = require("../index");
import IndexOptions = require("../../driver/indexOptions");
import TypeMappingFlags = require("../typeMappingFlags");
import PropertyFlags = require("../propertyFlags");
import ChangeTracking = require("../changeTracking");
import Configuration = require("../../config/Configuration");
import Map = require("../../map");

class AnnotationMappingProvider implements MappingProvider {

    private _filePaths: string[] = [];

    constructor(public config: Configuration) {

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

     getMapping(callback: ResultCallback<TypeMapping[]>): void {

        reflect.load(this._filePaths, (err, symbols) => {
            if(err) return callback(err);

            var builder = new TypeMappingBuilder(this.config);
            var mappings = builder.build(symbols);

            if(builder.hasErrors) {
                callback(new Error(builder.getErrorMessage()), null);
            }
            else {
                callback(null, mappings);
            }
        });
    }
}

interface TypeMappingTable {

    [id: number]: TypeMapping;
}

class TypeMappingBuilder {

    private _typeMappings: TypeMapping[] = [];
    private _typeMappingTable: TypeMappingTable = {};

    private _errors: string[] = [];

    constructor(public config: Configuration) {

    }

    build(symbols: reflect.Symbol[]): TypeMapping[] {

        // Go through the symbols and find all classes that are annotated with 'collection' and their subclasses
        for(var i = 0, l = symbols.length; i < l; i++) {
            this._findDocumentTypes(symbols[i]);
        }

        this._ensureOneCollectionPerHierarchy();

        var mappings = this._typeMappings;
        for(var i = 0, l = mappings.length; i < l; i++) {
            this._scanPropertiesForEmbeddedTypes(mappings[i].type);
        }

        for(var i = 0, l = mappings.length; i < l; i++) {
            this._populateTypeMapping(mappings[i]);
        }

        return mappings;
    }

    get hasErrors(): boolean {
        return this._errors.length > 0;
    }

    getErrorMessage(): string {
        return "Unable to build type mappings from declaration files:\n" + this._errors.join("\n");
    }

    private _findDocumentTypes(symbol: reflect.Symbol): void {

        // TODO: what about supertypes (classes/interfaces) that don't have a collection attribute?

        if(symbol.isClass()) {
            var type = symbol.getDeclaredType();
            if(type.hasAnnotation("collection", true)) {
                this._addDocumentType(type);
            }
        }

        var exports = symbol.getExports(reflect.SymbolFlags.Class | reflect.SymbolFlags.Namespace);
        for(var i = 0, l = exports.length; i < l; i++) {
            this._findDocumentTypes(exports[i]);
        }
    }

    private _ensureOneCollectionPerHierarchy(): void {

        var mappings = this._typeMappings;
        for(var i = 0, l = mappings.length; i < l; i++) {
            var mapping = mappings[i];
            if(this._subclassMarkedAsRootType(mapping)) {
                this._addAnnotationError(mapping, mapping.type.getAnnotations("collection")[0], "Only one class per inheritance hierarchy can have the 'collection' annotation.");
            }
        }
    }

    private _subclassMarkedAsRootType(mapping: TypeMapping): boolean {

        if(!(mapping.flags & TypeMappingFlags.RootType)) {
            return false;
        }

        var baseClass = mapping.type.getBaseClass();
        while(baseClass) {
            mapping = this._getTypeMapping(baseClass);
            if(!mapping) break;

            if(mapping.flags & TypeMappingFlags.RootType) {
                return true;
            }
            baseClass = baseClass.getBaseClass();
        }

        return false;
    }

    private _findSuperTypes(type: reflect.Type): void {

        // TODO: make sure embedded types don't extend or implement supertypes

        var baseTypes = type.getBaseTypes();
        for(var i = 0, l = baseTypes.length; i < l; i++) {
            var baseType = baseTypes[i];

            if(!this._isMappedType(baseType)) {
                this._addSuperType(baseType);
                this._findSuperTypes(baseType);
            }
        }
    }

    private _findEmbeddedTypes(type: reflect.Type): void {

        if(!type.isObjectType() || this._isMappedType(type) || ReflectHelper.isNativeType(type)) return;

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

        this._addEmbeddedType(type);
        this._scanPropertiesForEmbeddedTypes(type);
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

    private _addDocumentType(type: reflect.Type): void {

        var mapping = this._typeMappingTable[type.getId()] = new TypeMapping(type, TypeMappingFlags.DocumentType);
        this._typeMappings.push(mapping);
        if(type.hasAnnotation("collection")) {
            mapping.flags |= TypeMappingFlags.RootType;
        }
    }

    private _addSuperType(type: reflect.Type): void {

        var mapping = this._typeMappingTable[type.getId()] = new TypeMapping(type, TypeMappingFlags.SuperType);
        this._typeMappings.push(mapping);
    }

    private _addEmbeddedType(type: reflect.Type): void {

        var mapping = this._typeMappingTable[type.getId()] = new TypeMapping(type, TypeMappingFlags.EmbeddedType);
        this._typeMappings.push(mapping);
    }

    private _isMappedType(type: reflect.Type): boolean {

        return this._getTypeMapping(type) !== undefined;
    }

    private _getTypeMapping(type: reflect.Type): TypeMapping {

        return this._typeMappingTable[type.getId()];
    }

    private _populateTypeMapping(mapping: TypeMapping): void {

        if(mapping.flags & TypeMappingFlags.DocumentType) {
            mapping.root = this._getRootTypeMapping(mapping);
        }

        // get type level annotations
        var annotations = mapping.type.getAnnotations();
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
                    case "discriminatorField":
                        this._setDiscriminatorField(mapping, annotation.value);
                        break;
                    case "discriminatorValue":
                        this._setDiscriminatorValue(mapping, annotation.value);
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
                this._addAnnotationError(mapping, annotation, e.message);
            }
        }

        // process all properties in the type
        var properties = mapping.type.getProperties();
        for(var i = 0, l = properties.length; i < l; i++) {
            var symbol = properties[i];
            if(!symbol.isProperty()) continue;
            try {
                var property = this._createProperty(mapping, symbol);
                // add to mapping after property has been fully initialized
                mapping.addProperty(property);
            }
            catch(e) {
                this._addError("Invalid property '" + property.name + "' on type '" + mapping.type.getFullName() + "': " + e.message);
            }
        }

        mapping.addDefaultMappings(this.config);
    }

    private _createProperty(mapping: TypeMapping, symbol: reflect.Symbol): Property {

        var property = new Property(symbol);

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
                    case "field":
                        this._setField(property, annotation.value);
                        break;
                    case "index":
                        // queue up index annotations till after all annotations are processed and default mappings
                        // are applied because we may not know the field name yet.
                        (indexAnnotations || (indexAnnotations = [])).push(annotation);
                        break;
                }
            }
        }
        catch (e) {
            this._addPropertyAnnotationError(mapping, property, annotation, e.message);
        }

        property.addDefaultMappings(this.config);

        // after all annotations are processed and default mappings are set, add any property indexes
        if(indexAnnotations) {
            try {
                for (var i = 0, l = indexAnnotations.length; i < l; i++) {
                    var annotation = indexAnnotations[i];
                    this._addPropertyIndex(mapping, property, indexAnnotations[i].value);
                }
            }
            catch (e) {
                this._addPropertyAnnotationError(mapping, property, annotation, e.message);
            }
        }

        return property;
    }

    private _setCollection(mapping: TypeMapping, value: any): void {

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

    private _addIndex(mapping: TypeMapping, value: any): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertDocumentType(mapping);

        if(!value.keys) {
            throw new Error("Missing require property 'keys'.");
        }

        // TODO: validate index options

        // TODO: validate index keys
        mapping.addIndex(value);
    }

    private _addPropertyIndex(mapping: TypeMapping, property: Property, value: any): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertDocumentType(mapping);

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

    private _setDiscriminatorField(mapping: TypeMapping, value: any): void {

        this._assertRootType(mapping);
        this._assertString(value);

        mapping.discriminatorField = value;
    }

    private _setDiscriminatorValue(mapping: TypeMapping, value: any): void {

        this._assertDocumentType(mapping);
        this._assertString(value);

        mapping.setDiscriminatorValue(value);
    }

    private _setVersioned(mapping: TypeMapping, value: any): void {

        this._assertRootType(mapping);

        if(value === undefined) {
            mapping.versioned = true;
        }
        else {
            this._assertBoolean(value);
            mapping.versioned = value;
        }
    }

    private _setLockable(mapping: TypeMapping, value: any): void {

        this._assertRootType(mapping);

        if(value === undefined) {
            mapping.lockable = true;
        }
        else {
            this._assertBoolean(value);
            mapping.lockable = value;
        }
    }

    private _setVersionField(mapping: TypeMapping, value: any): void {

        this._assertRootType(mapping);
        this._assertString(value);

        mapping.versionField = value;
        mapping.versioned = true;
    }

    private _setLockField(mapping: TypeMapping, value: any): void {

        this._assertRootType(mapping);
        this._assertString(mapping);

        mapping.lockField = value;
        mapping.lockable = true;
    }

    private _setChangeTracking(mapping: TypeMapping, value: any): void {

        this._assertRootType(mapping);
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

        if(typeof value !== "string") {
            throw new Error("Property 'cascade' should be of type string.")
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

    private _getRootTypeMapping(mapping: TypeMapping): TypeMapping {

        if(mapping.flags & TypeMappingFlags.RootType) {
            return mapping;
        }

        var baseClass = mapping.type;

        while(baseClass) {
            var mapping = this._getTypeMapping(baseClass);
            if(mapping.flags & TypeMappingFlags.RootType) {
                return mapping;
            }
            baseClass = baseClass.getBaseClass();
        }

        this._addError("Could not find root type for type '" + mapping.type.getName() + "'.");
    }

    private _assertDocumentType(mapping: TypeMapping): void {

        if(!(mapping.flags & TypeMappingFlags.DocumentType)) {
            throw new Error("Annotation can only be defined on classes that are mapped to a collection.");
        }
    }

    private _assertRootType(mapping: TypeMapping): void {

        if(!(mapping.flags & TypeMappingFlags.RootType)) {
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

    private _addAnnotationError(symbol: reflect.Symbol, annotation: reflect.Annotation, message: string): void;
    private _addAnnotationError(mapping: TypeMapping, annotation: reflect.Annotation, message: string): void;
    private _addAnnotationError(symbolOrMapping: any, annotation: reflect.Annotation, message: string): void {

        if(symbolOrMapping instanceof TypeMapping) {
            var name = <string>symbolOrMapping.type.getFullName();
        }
        else {
            var name = <string>symbolOrMapping.getFullName();
        }
        this._addError(annotation.getDeclarationFileName() + ": Invalid annotation '" + annotation.name + "' on '" + name + "': " + message);
    }

    private _addPropertyAnnotationError(mapping: TypeMapping, property: Property, annotation: reflect.Annotation, message: string): void {

        this._addError(annotation.getDeclarationFileName() + ": Invalid annotation '" + annotation.name + "' on property '" + property.name + "' of type '" + mapping.type.getFullName() + "': " + message);
    }

    private _addError(message: string): void {

        this._errors.push(message);
    }
}

export = AnnotationMappingProvider;