/// <reference path="../../../typings/async.d.ts" />
/// <reference path="../../../typings/glob.d.ts" />
/// <reference path="../../../typings/node.d.ts" />

import * as async from "async";
import * as path from "path";
import * as glob from "glob";
import * as ReflectUtil from "../../core/reflectUtil";
import {absolutePath, hasExtension} from "../../core/fileUtil";
import {ResultCallback} from "../../core/resultCallback";
import {MappingRegistry} from "../mappingRegistry";
import {MappingProvider} from "./mappingProvider";
import {Index} from "../index";
import {IndexOptions} from "../indexOptions";
import {PropertyFlags} from "../propertyFlags";
import {ChangeTrackingType} from "../changeTrackingType";
import {Lookup} from "../../core/lookup";
import {EnumType} from "../enumType";
import {Mapping} from "../mapping";
import {MappingFlags} from "../mappingFlags";
import {Configuration} from "../../config/configuration";
import {ReflectContext} from "../../core/reflectContext";
import {Type} from "../../core/type";
import {Symbol} from "../../core/symbol";
import {
    EntityAnnotation,
    EmbeddableAnnotation,
    ConverterAnnotation,
    CollectionAnnotation,
    IndexAnnotation,
    VersionFieldAnnotation,
    VersionedAnnotation,
    ChangeTrackingAnnotation,
    DiscriminatorFieldAnnotation,
    DiscriminatorValueAnnotation,
    TransientAnnotation,
    ReferenceManyAnnotation,
    ReferenceOneAnnotation,
    EmbedManyAnnotation,
    EmbedOneAnnotation,
    FieldAnnotation,
    EnumeratedAnnotation
} from "./annotations";
import {Constructor} from "../../core/constructor";

export class AnnotationMappingProvider implements MappingProvider {

    private _modules: Object[] = [];
    private _reflect: ReflectContext;

    constructor(modules?: Object | Object[]) {

        if(modules) {
            if (!Array.isArray(modules)) {
                modules = [<Object>modules];
            }
            this.addModules(<Object[]>modules);
        }

        this._reflect = new ReflectContext();
    }

    addModule(module: Object): void {

        if(module) {
            this._modules.push(module);
        }
    }

    addModules(modules: Object[]): void {

        if(modules) {
            for(let module of modules) {
                this.addModule(module);
            }
        }
    }

    // 1. Find all the classes that are annotated with "entity" or are a subclass of a class
    //    that is annotated with "entity"
    // 2. Recursively search types found in #1 to find all other object types. Make sure to only search
    //    declared fields so we are not duplicating searches from the parent type.
    // 3. Build type mapping. Mark properties as having an intrinsic type, embedded, or reference. It's a reference
    //    if it's a reference to a class that was found in #1. It's embedded if it's a reference to a type found in #2 or is an anonymous type

    // TODO: support UUID for _id in addition to ObjectID?  I believe it's universally unique just like ObjectID so shouldn't be a big deal to support.

    // TODO: any special mapping for enumerations? allowing changing persisted value, etc.

    // TODO: have a plan for supporting all these data types: http://docs.mongodb.org/manual/reference/bson-types/

     getMapping(config: Configuration, callback: ResultCallback<Mapping.ClassMapping[]>): void {

         var types: Set<Type> = new Set();

         for(let module of this._modules) {
             this._processExports(types, module);
         }

         var builder = new MappingBuilder(config, this._reflect);
         var mappings = builder.build(types);

         if(builder.hasErrors) {
             callback(new Error(builder.getErrorMessage()), null);
         }
         else {
             callback(null, mappings);
         }
    }

    private _processExports(types: Set<Type>, obj: any): boolean {

        // check to see if the export is an Entity or Embeddable type
        if(typeof obj === "function") {
            var type = this._reflect.getType(obj);
            if(type.hasAnnotation(EntityAnnotation, true) || type.hasAnnotation(EmbeddableAnnotation, true) || type.hasAnnotation(ConverterAnnotation)) {
                types.add(type);
            }
        }
        else if (typeof obj !== "object") {
            return;
        }

        // recursive search exports for types
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                this._processExports(types, obj[p]);
            }
        }
    }
}

enum MappingKind {

    Entity,
    RootEntity,
    Embeddable,
    RootEmbeddable,
    Global,
    Enumerated,
    Converted
}

interface TypeLinks {

    type: Type;
    kind: MappingKind;
    mapping?: Mapping;
}

class MappingBuilder {

    private _objectTypes: Type[] = [];
    private _typeTable: WeakMap<Type, TypeLinks> = new WeakMap();
    private _typesByName: Map<string, Type> = new Map();
    private _errors: string[] = [];
    private _mappings: Mapping.ClassMapping[] = [];
    private _reflect: ReflectContext;

    constructor(public config: Configuration, reflect: ReflectContext) {

        this._reflect = reflect;
    }

    build(types: Set<Type>): Mapping.ClassMapping[] {

        // create global mappings
        this._addGlobalMapping("String", Mapping.createStringMapping());
        this._addGlobalMapping("Number", Mapping.createNumberMapping());
        this._addGlobalMapping("Boolean", Mapping.createBooleanMapping());
        this._addGlobalMapping("Date", Mapping.createDateMapping());
        this._addGlobalMapping("RegExp", Mapping.createRegExpMapping());
        this._addGlobalMapping("Buffer", Mapping.createBufferMapping());

        // find all entity types
        types.forEach(type => this._findTypes(type));

        this._ensureOneRootPerHierarchy();

        // Create mappings. We need to create the mappings before we populate so we can create property mappings.
        for(let type of this._objectTypes) {
            var links = this._getTypeLinks(type);
            if(!links.mapping) {
                this._createMapping(links);
            }
        }

        // Populate mappings.
        for(let type of this._objectTypes) {
            this._populateMapping(this._getTypeLinks(type));
        }

        return this._mappings;
    }

    private _addGlobalMapping(name: string, mapping: Mapping): void {

        var ctr = (<any>global)[name];
        if(!ctr) {
            throw new Error("Could not find global type '" + name + '.');
        }

        var type = this._reflect.getType(ctr);

        this._setTypeLinks(type, {
            type: type,
            mapping: mapping,
            kind: MappingKind.Global
        });
    }

    private _setTypeLinks(type: Type, links: TypeLinks): TypeLinks {

        if(this._typesByName.has(type.name)) {
            throw new Error("Duplicate class name '" + type.name + "'. All Entity and Embedded classes must have unique names.");
        }
        this._typesByName.set(type.name, type);
        this._typeTable.set(type, links);

        return links;
    }

    private _resolveType(type: Constructor<any> | string): Type {

        if(typeof type === "string") {
            var resolved = this._typesByName.get(type);
            if(!resolved) {
                throw new Error("Unknown type '" + type + "'.");
            }
            return resolved;
        }

        return this._reflect.getType(<Constructor<any>>type);
    }

    private _getTypeLinks(type: Type): TypeLinks {

        return this._typeTable.get(type);
    }

    get hasErrors(): boolean {
        return this._errors.length > 0;
    }

    getErrorMessage(): string {
        return "Unable to build type mappings from declaration files:\n" + this._errors.join("\n");
    }

    private _findTypes(type: Type): void {

        if(!type || this._isCollection(type) || this._getTypeLinks(type)) {
            return;
        }

        if(type.hasAnnotation(ConverterAnnotation)) {
            this._addObjectType(type, MappingKind.Converted);
            return;
        }

        if(type.hasAnnotation(EntityAnnotation, true)) {
            this._addObjectType(type, type.hasAnnotation(EntityAnnotation) ? MappingKind.RootEntity : MappingKind.Entity);
        }
        else if(type.hasAnnotation(EmbeddableAnnotation, true)) {
            this._addObjectType(type, type.hasAnnotation(EmbeddableAnnotation) ? MappingKind.RootEmbeddable : MappingKind.Embeddable);
        }
        else {
            return;
        }

        this._scanPropertiesForTypes(type);
    }

    private _scanPropertiesForTypes(type: Type): void {

        for(var property of type.properties) {
            this._findTypes(this._getPropertyTypeToScan(property));
        }
    }

    private _getPropertyTypeToScan(property: Symbol): Type {

        // If the property has a converter, the type is ignored.
        if(property.hasAnnotation(ConverterAnnotation)) {
            return null;
        }

        var annotation: { target: Constructor<any> | string },
            target: Constructor<any> | string;

        annotation = property.getAnnotations(ReferenceManyAnnotation)[0];
        if(annotation) {
            target = annotation.target;
        }
        else {
            annotation = property.getAnnotations(ReferenceOneAnnotation)[0];
            if (annotation) {
                target = annotation.target;
            }
            else {
                annotation = property.getAnnotations(EmbedManyAnnotation)[0];
                if (annotation) {
                    target = annotation.target;
                }
                else {
                    annotation = property.getAnnotations(EmbedOneAnnotation)[0];
                    if (annotation) {
                        target = annotation.target;
                    }
                }
            }
        }

        // If an annotation was provided, we want to use the target even if it's null. If the target was null then
        // that means there was a circular reference or the type was used before it was defined so we should return
        // null so we can inform the user of the error.
        if(annotation) {
            // Since this is used for type discovery, we are not interested in type indicated by name.
            if (typeof target === "string") {
                return null;
            }
            return this._reflect.getType(<Constructor<any>>target);
        }

        return property.type;
    }

    private _addObjectType(type: Type, kind: MappingKind): void {

        this._objectTypes.push(type);
        this._addType(type, kind);
    }

    private _addType(type: Type, kind: MappingKind): TypeLinks {

        return this._setTypeLinks(type, {
            type: type,
            kind: kind
        });
    }

    private _ensureOneRootPerHierarchy(): void {

        var types = this._objectTypes;
        for(var i = 0, l = types.length; i < l; i++) {
            var type = types[i];
            if(this._subclassMarkedAsRootType(type)) {
                var annotation = type.getAnnotations(EntityAnnotation)[0] || type.getAnnotations(EmbeddableAnnotation)[0];
                this._addAnnotationError(type, annotation, "Only one class per inheritance hierarchy can have the @Entity or @Embeddable annotation.");
            }
        }
    }

    private _subclassMarkedAsRootType(type: Type): boolean {

        var links = this._getTypeLinks(type);
        if(links.kind != MappingKind.RootEntity && links.kind != MappingKind.RootEmbeddable) {
            return false;
        }

        var baseClass = type.baseType;
        while(baseClass) {
            var links = this._getTypeLinks(baseClass);
            if(links && (links.kind == MappingKind.RootEntity || links.kind == MappingKind.RootEmbeddable)) {
                return true;
            }
            baseClass = baseClass.baseType;
        }

        return false;
    }

    private _createMapping(links: TypeLinks): Mapping {

        var mapping: Mapping,
            type = links.type;

        switch(links.kind) {
            case MappingKind.RootEmbeddable:
                mapping = Mapping.createClassMapping();
                break;
            case MappingKind.Embeddable:
                var parentMapping = this._getParentMapping(type);
                if(parentMapping && (parentMapping.flags & MappingFlags.Embeddable) == 0) {
                    this._addError("Parent of mapping for '" + type.name + "' must be an embeddable mapping.");
                }
                mapping = Mapping.createClassMapping(parentMapping);
                break;
            case MappingKind.RootEntity:
                mapping = Mapping.createEntityMapping();
                break;
            case MappingKind.Entity:
                var parentMapping = this._getParentMapping(type);
                if(parentMapping && (parentMapping.flags & MappingFlags.Entity) == 0) {
                    this._addError("Parent of mapping for '" + type.name + "' must be an entity mapping.");
                }
                mapping = Mapping.createEntityMapping((<Mapping.EntityMapping>parentMapping));
                break;
            case MappingKind.Converted:
                mapping = this._createConverterMapping(type.getAnnotations(ConverterAnnotation)[0]);
                break;
        }

        return links.mapping = mapping;
    }

    private _getParentMapping(type: Type): Mapping.ClassMapping {

        var baseClass = type.baseType;
        if(baseClass) {
            var links = this._getTypeLinks(baseClass);
            if(links) {
                var mapping = links.mapping
                if (!mapping) {
                    // If the mapping for the parent class does not exist, creat it
                    mapping = this._createMapping(links);
                    if (!mapping) {
                        this._addError("Error creating parent mapping for '" + type.name + "'.");
                        return undefined;
                    }
                }

                if ((mapping.flags & MappingFlags.Class) == 0) {
                    this._addError("Parent of mapping for '" + type.name + "' must be a class mapping.");
                    return undefined;
                }

                return <Mapping.ClassMapping>links.mapping;
            }
        }
    }

    private _populateMapping(links: TypeLinks): void {

        if(links.mapping.flags & MappingFlags.Entity) {
            this._populateEntityMapping(<Mapping.EntityMapping>links.mapping, links.type);
            return;
        }
        if(links.mapping.flags & MappingFlags.Class) {
            this._populateClassMapping(<Mapping.ClassMapping>links.mapping, links.type);
            return;
        }
        if(links.mapping.flags & MappingFlags.Object) {
            this._populateObjectMapping(<Mapping.ObjectMapping>links.mapping, links.type);
            return;
        }
    }

    private _populateEntityMapping(mapping: Mapping.EntityMapping, type: Type): Mapping {

        // get type level annotations
        var annotations = type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = annotations[i];

            try {
                switch (annotation.constructor.name) {
                    case "CollectionAnnotation":
                        this._setCollection(mapping, <CollectionAnnotation>annotation);
                        break;
                    case "IndexAnnotation":
                        this._addIndex(mapping, <IndexAnnotation>annotation);
                        break;
                    case "VersionFieldAnnotation":
                        this._setVersionField(mapping, <VersionFieldAnnotation>annotation);
                        break;
                    case "VersionedAnnotation":
                        this._setVersioned(mapping, <VersionedAnnotation>annotation);
                        break;
                    case "ChangeTrackingAnnotation":
                        this._setChangeTracking(mapping, <ChangeTrackingAnnotation>annotation);
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

            if(mapping.versioned == null) {
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

            if(mapping.identity == null) {
                mapping.identity = this.config.identityGenerator;
            }
        }

        return mapping;
    }

    private _populateClassMapping(mapping: Mapping.ClassMapping, type: Type): Mapping {

        mapping.name = type.name;
        mapping.classConstructor = <any>type.ctr;

        // get type level annotations
        var annotations = type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = annotations[i];

            try {
                switch (annotation.constructor.name) {
                    case "DiscriminatorFieldAnnotation":
                        this._setDiscriminatorField(mapping, <DiscriminatorFieldAnnotation>annotation);
                        break;
                    case "DiscriminatorValueAnnotation":
                        this._setDiscriminatorValue(mapping, <DiscriminatorValueAnnotation>annotation);
                        break;
                }
            }
            catch(e) {
                this._addAnnotationError(type, annotation, e.message);
            }
        }

        // add default values
        if (mapping.flags & MappingFlags.InheritanceRoot) {
            if (!mapping.discriminatorField) {
                mapping.discriminatorField = this.config.discriminatorField;
            }
        }

        // if we are a document type and the the discriminatorValue is not set, default to the class name
        if (!mapping.discriminatorValue  && (mapping.hasBaseClass || mapping.hasSubClasses)) {
            mapping.setDiscriminatorValue(this.config.discriminatorNamingStrategy(mapping.name));
        }

        this._mappings.push(mapping);

        return this._populateObjectMapping(mapping, type);
    }

    private _populateObjectMapping(mapping: Mapping.ObjectMapping, type: Type): Mapping {

        for(var symbol of type.properties) {

            try {
                var property = this._createProperty(mapping, symbol);
                if(property) {
                    // add to mapping after property has been fully initialized
                    mapping.addProperty(property);
                }
            }
            catch(e) {
                this._addError("Invalid property '" + symbol.name + "' on type '" + type.name + "': " + e.message);
                return null;
            }
        }

        // TODO: handle what addDefaultMapping did
        //mapping.addDefaultMappings(this.config);

        // The mapping holds all properties inlcuding the properties for it's base types so populate those as well.
        if(type.baseType) {
            this._populateObjectMapping(mapping, type.baseType);
        }

        return mapping;
    }

    private _createProperty(mapping: Mapping, symbol: Symbol): Mapping.Property {

        try {
            var propertyMapping = this._createPropertyMapping(symbol);
        }
        catch(e) {
            this._addError("Error creating property '" + symbol.name + "' of type '" + symbol.parent.name + "': " + e.message);
            return null;
        }

        var property = Mapping.createProperty(symbol.name, propertyMapping);

        // process all property annotations
        var annotations = symbol.getAnnotations(),
            indexAnnotations: IndexAnnotation[];

        try {
            for (var i = 0, l = annotations.length; i < l; i++) {
                var annotation = annotations[i];

                switch (annotation.constructor.name) {
                    // TODO: Confirm that the Transient annotation is no longer needed
                    /*
                    case "transient":
                        property.setFlags(PropertyFlags.Ignored);
                        break;
                        */
                    case "ReferenceManyAnnotation":
                        this._setReferenced(property, <ReferenceManyAnnotation>annotation);
                        break;
                    case "ReferenceOneAnnotation":
                        this._setReferenced(property, <ReferenceOneAnnotation>annotation);
                        break;
                    case "FieldAnnotation":
                        this._setField(property, <FieldAnnotation>annotation);
                        break;
                    case "IndexAnnotation":
                        // queue up index annotations until after all annotations are processed and default mappings
                        // are applied because we may not know the field name yet.
                        (indexAnnotations || (indexAnnotations = [])).push(<IndexAnnotation>annotation);
                        break;
                }
            }
        }
        catch (e) {
            this._addPropertyAnnotationError(symbol, annotation, e.message);
        }

        // add default values
        if(!property.field && !(property.flags & PropertyFlags.Ignored)) {
            property.field = this.config.fieldNamingStrategy(property.name);
        }

        // after all annotations are processed and default mappings are set, add any property indexes
        if(indexAnnotations) {
            try {
                for (var i = 0, l = indexAnnotations.length; i < l; i++) {
                    var indexAnnotation = indexAnnotations[i];
                    this._addPropertyIndex(<Mapping.EntityMapping>mapping, property, indexAnnotations[i]);
                }
            }
            catch (e) {
                this._addPropertyAnnotationError(symbol, indexAnnotation, e.message);
            }
        }

        return property;
    }

    private _createPropertyMapping(symbol: Symbol): Mapping {

        if(symbol.hasAnnotation(ConverterAnnotation)) {
            return this._createConverterMapping(symbol.getAnnotations(ConverterAnnotation)[0]);
        }

        var propertyType = this._getPropertyType(symbol);
        if(!propertyType) {
            throw new Error("Unable to determine type of property. This may be because of a circular reference or the type is used before it is defined. Try adding @EmbedOne or @ReferenceOne annotation with the name of the class as the target.");
        }

        if(symbol.hasAnnotation(EnumeratedAnnotation)) {
            return this._createEnumMapping(propertyType, symbol.getAnnotations(EnumeratedAnnotation)[0]);
        }

        if(this._isCollection(propertyType)) {
            var referencedAnnotation = symbol.getAnnotations(ReferenceManyAnnotation)[0];
            if(referencedAnnotation) {
                if(!referencedAnnotation.target) {
                    throw new Error("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class .");
                }
                var mapping = this._createTypeMapping(referencedAnnotation.target);
                if(!(mapping.flags & MappingFlags.Entity)) {
                    throw new Error("Target of @ReferenceMany annotation must be an Entity.");
                }
                return Mapping.createArrayMapping(mapping);
            }

            var embeddedAnnotation = symbol.getAnnotations(EmbedManyAnnotation)[0];
            if(embeddedAnnotation) {
                if(!embeddedAnnotation.target) {
                    throw new Error("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class.");
                }
                var mapping = this._createTypeMapping(embeddedAnnotation.target);
                if(!(mapping.flags & (MappingFlags.Embeddable | MappingFlags.Boolean | MappingFlags.String | MappingFlags.Number | MappingFlags.Enum | MappingFlags.RegExp | MappingFlags.Date | MappingFlags.Buffer))) {
                    throw new Error("Target of @EmbedMany annotation must be a built-in type or a class annotated with @Embeddable.");
                }
                return Mapping.createArrayMapping(mapping);
            }

            throw new Error("Properties with array types must be annotated with @ReferenceMany or @EmbedMany.");
        }

        return this._createTypeMapping(propertyType);
    }

    private _getPropertyType(symbol: Symbol): Type {

        // Check to see if type is specified by an annotation
        var target: Constructor<any> | string;

        var referencedAnnotation = symbol.getAnnotations(ReferenceOneAnnotation)[0];
        if(referencedAnnotation) {
            target = referencedAnnotation.target;
        }
        else {
            var embeddedAnnotation = symbol.getAnnotations(EmbedOneAnnotation)[0];
            if (embeddedAnnotation) {
                target = embeddedAnnotation.target;
            }
        }

        if(target) {
            return this._resolveType(target);
        }

        // get property type from the compiler generated metadata.
        return symbol.type;
    }

    private _isCollection(type: Type): boolean {

        return type && type.isArray;

        //return type != null && (type.name == "Array" || type.name == "Set" || type.name == "Map");
    }

    private _createTypeMapping(target: Type | Constructor<any> | string): Mapping {

        var type: Type;

        if(typeof target === "string" || typeof target === "function") {

            type = this._resolveType(<(Constructor<any> | string)>target);
        }
        else {
            type = <Type>target;
        }

        var links = this._getTypeLinks(type);
        if(links && links.mapping) {
            return links.mapping;
        }

        // TODO: What to do about any type? In fact, what to do about anything that ends up as "Object" here?
        /*
         if(type.isAny()) {
         throw new Error("'Any' type is not supported.");
         }
         */

        throw new Error("Unable to create mapping for '" + type.name + "'.");

    }

    private _createConverterMapping(annotation: ConverterAnnotation): Mapping {

        if(annotation.converter) {
            return Mapping.createConverterMapping(annotation.converter);
        }

        if(annotation.converterCtr) {
            return Mapping.createConverterMapping(new annotation.converterCtr());
        }

        if(!annotation.converterName) {
            throw new Error("Invalid annotation @Converter. A convert instance, constructor, or name must be specified.");
        }

        var converter = this.config.propertyConverters && this.config.propertyConverters[annotation.converterName];
        if(!converter) {
            throw new Error("Invalid annotation @Converter. Unknown converter '" + annotation.converterName + "'. Make sure to add your converter to propertyConverters in the configuration.");
        }

        return Mapping.createConverterMapping(converter);
    }

    private _createEnumMapping(type: Type, annotation: EnumeratedAnnotation): Mapping {

        if(!type.isNumber) {
            throw new Error("Cannot use @Enumerated annotation on a non-numeric field.");
        }

        var members: { [name: string]: number } = {};

        // Pull the name => number side out of the enum since that is what the EnumMappingImpl expects.
        for(var name in annotation.members) {
            if(typeof name === "string" && annotation.members.hasOwnProperty(name)) {
                members[name] = (<any>annotation.members)[name];
            }
        }

        var enumMapping = Mapping.createEnumMapping(members);
        enumMapping.type = EnumType.String;

        return enumMapping;
    }

    private _setCollection(mapping: Mapping.EntityMapping, value: CollectionAnnotation): void {

        this._assertRootEntityMapping(mapping);

        if(value.name) {
            mapping.collectionName = value.name;
        }

        mapping.collectionOptions = value.options;
        // TODO: validate options

        if(value.db) {
            mapping.databaseName = value.db;
        }
    }

    private _addIndex(mapping: Mapping.EntityMapping, value: Index): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);

        if(!value.keys) {
            throw new Error("Missing require property 'keys'.");
        }

        // TODO: validate index options

        // TODO: validate index keys
        mapping.addIndex(value);
    }

    private _addPropertyIndex(mapping: Mapping.EntityMapping, property: Mapping.Property, value: IndexAnnotation): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);

        var keys: [string, number][] = [];

        var order: number;
        if(value.order !== undefined) {
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
        keys.push([property.field, order]);

        this._addIndex(mapping, {
            keys: keys,
            options: value.options
        });

    }

    private _isEntity(type: Type): boolean {

        var links = this._getTypeLinks(type);
        return links && (links.kind == MappingKind.Entity || links.kind == MappingKind.RootEntity);
    }

    private _setDiscriminatorField(mapping: Mapping.ClassMapping, annotation: DiscriminatorFieldAnnotation): void {

        this._assertRootClassMapping(mapping);

        mapping.discriminatorField = annotation.name;
    }

    private _setDiscriminatorValue(mapping: Mapping.ClassMapping, annotation: DiscriminatorValueAnnotation): void {

        this._assertClassMapping(mapping);

        mapping.setDiscriminatorValue(annotation.value);
    }

    private _setVersioned(mapping: Mapping.EntityMapping, annotation: VersionedAnnotation): void {

        this._assertRootEntityMapping(mapping);

        mapping.versioned = annotation.enabled;
    }

    private _setVersionField(mapping: Mapping.EntityMapping, annotation: VersionFieldAnnotation): void {

        this._assertRootEntityMapping(mapping);

        mapping.versionField = annotation.name;
        mapping.versioned = true;
    }

    private _setChangeTracking(mapping: Mapping.EntityMapping, annotation: ChangeTrackingAnnotation): void {

        this._assertRootEntityMapping(mapping);

        mapping.changeTracking = annotation.type;
    }

    private _setReferenced(property: Mapping.Property, annotation: ReferenceManyAnnotation): void {

        if(annotation.inverseOf) {
            // TODO: validate inverse relationship
            property.inverseOf = annotation.inverseOf;
            property.setFlags(PropertyFlags.InverseSide);
        }

        if(annotation.cascade) {
            property.setFlags(annotation.cascade & PropertyFlags.CascadeAll);
        }
    }

    private _setField(property: Mapping.Property, annotation: FieldAnnotation): void {

        if(annotation.name) {
            property.field = annotation.name;
        }
        if(annotation.nullable) {
            property.setFlags(PropertyFlags.Nullable);
        }
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

        var classMapping = <Mapping.ClassMapping>mapping;
        if(!(classMapping.flags & MappingFlags.InheritanceRoot)) {
            throw new Error("Annotation can only be defined on classes that are the root of a mapped inheritance hierarchy.");
        }
    }

    private _addAnnotationError(type: Type, annotation: any, message: string): void {

        this._addError("Invalid annotation '" + (annotation && annotation.constructor.name) + "' on '" + type.name + "': " + message);
    }

    private _addPropertyAnnotationError(symbol: Symbol, annotation: any, message: string): void {

        this._addError("Invalid annotation '" + (annotation && annotation.constructor.name) + "' on property '" + symbol.name + "' of type '" + symbol.parent.name + "': " + message);
    }

    private _addError(message: string): void {

        this._errors.push(message);
    }
}
