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

export class AnnotationMappingProvider implements MappingProvider {

    private _modules: Object[] = [];
    private _types: Type[] = [];

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

         for(let module of this._modules) {

             this._processExports(module);
         }

         var builder = new MappingBuilder(config);
         var mappings = builder.build(this._types);

         if(builder.hasErrors) {
             callback(new Error(builder.getErrorMessage()), null);
         }
         else {
             callback(null, mappings);
         }
    }

    private _processExports(obj: any): boolean {

        // check to see if the export is an Entity or Embeddable type
        if(typeof obj === "function") {
            if(ReflectUtil.hasClassAnnotation(obj, EntityAnnotation, true) || ReflectUtil.hasClassAnnotation(obj, EmbeddableAnnotation, true) || ReflectUtil.hasClassAnnotation(obj, ConverterAnnotation)) {
                this._types.push(obj);
            }
        }
        else if (typeof obj !== "object") {
            return;
        }

        // recursive search exports for types
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                this._processExports(obj[p]);
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

interface Type {
    name?: string;
    new(...args: any[]): any;
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

    constructor(public config: Configuration) {

    }

    build(types: Type[]): Mapping.ClassMapping[] {

        // create global mappings
        this._addGlobalMapping("String", Mapping.createStringMapping());
        this._addGlobalMapping("Number", Mapping.createNumberMapping());
        this._addGlobalMapping("Boolean", Mapping.createBooleanMapping());
        this._addGlobalMapping("Date", Mapping.createDateMapping());
        this._addGlobalMapping("RegExp", Mapping.createRegExpMapping());
        this._addGlobalMapping("Buffer", Mapping.createBufferMapping());

        // find all entity types
        for(var i = 0, l = types.length; i < l; i++) {
            this._findClasses(types[i]);
        }

        this._ensureOneRootPerHierarchy();

        // TODO: identity supertypes as embeddable or entity. error on conflicts.
        // TODO: perhaps named types should be required to have @entity or @embeddable. how to handle multiple inheritance?
        // find all embedded types
        var objectTypes = this._objectTypes;
        for(var i = 0, l = objectTypes.length; i < l; i++) {
            this._scanPropertiesForEmbeddedTypes(objectTypes[i]);
        }

        // Create mappings. We need to create the mappings before we populate so we can create property mappings.
        for(var i = 0, l = objectTypes.length; i < l; i++) {
            var links = this._getTypeLinks(objectTypes[i]);
            if(!links.mapping) {
                this._createMapping(links);
            }
        }

        // Populate mappings.
        for(var i = 0, l = objectTypes.length; i < l; i++) {
            this._populateMapping(this._getTypeLinks(objectTypes[i]));
        }

        return this._mappings;
    }

    private _addGlobalMapping(name: string, mapping: Mapping): void {

        var type = (<any>global)[name];
        if(!type) {
            throw new Error("Could not find global type '" + name + '.');
        }
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

    private _resolveType(type: Type | string): Type {

        if(typeof type === "string") {
            var resolved = this._typesByName.get(type);
            if(!resolved) {
                throw new Error("Unknown type '" + type + "'.");
            }
            return resolved;
        }

        return <Type>type;
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

    private _findClasses(obj: Type | Object): void {

        if(typeof obj === "function") {
            if(ReflectUtil.hasClassAnnotation(<Type>obj, EntityAnnotation, true)) {
                this._addObjectType(<Type>obj, ReflectUtil.hasClassAnnotation(<Type>obj, EntityAnnotation) ? MappingKind.RootEntity : MappingKind.Entity);
            }
            else if(ReflectUtil.hasClassAnnotation(<Type>obj, EmbeddableAnnotation, true)) {
                this._addObjectType(<Type>obj, ReflectUtil.hasClassAnnotation(<Type>obj, EmbeddableAnnotation) ? MappingKind.RootEmbeddable : MappingKind.Embeddable);
            }
            else if(ReflectUtil.hasClassAnnotation(<Type>obj, ConverterAnnotation)) {
                this._addObjectType(<Type>obj, MappingKind.Converted);
            }
        } else if(typeof obj !== "object") {
            return;
        }

        // recursively search exports for classes
        for(var p in obj) {
            if(obj.hasOwnProperty(p)) {
                this._findClasses((<any>obj)[p]);
            }
        }
    }

    private _scanPropertiesForEmbeddedTypes(type: Type): void {

        var propertyNames = ReflectUtil.getPropertyNames(type);
        for(var i = 0; i < propertyNames.length; i++) {
            var propertyName = propertyNames[i];
            var propertyType = this._getPropertyType(type, propertyName);

            if(propertyType && !ReflectUtil.hasPropertyAnnotation(<Type>type, propertyName, ConverterAnnotation)) {

                if(this._isArray(propertyType)) {
                    var elementType = this._getCollectionElementType(<Type>type, propertyName);
                    if(elementType) {
                        this._findEmbeddedTypes(elementType);
                    }
                }
                else {
                    this._findEmbeddedTypes(propertyType);
                }
            }
        }
    }

    private _getPropertyType(type: Type, propertyName: string): Type {

        // Check to see if type is specified by an annotation
        var target: Type | string;

        var referencedAnnotation = ReflectUtil.getPropertyAnnotations(type, propertyName, ReferenceOneAnnotation)[0];
        if(referencedAnnotation) {
            target = referencedAnnotation.target;
        }
        else {
            var embeddedAnnotation = ReflectUtil.getPropertyAnnotations(type, propertyName, EmbedOneAnnotation)[0];
            if (embeddedAnnotation) {
                target = embeddedAnnotation.target;
            }
        }

        if(target) {
            return this._resolveType(target);
        }

        // get property type from the compiler generated metadata.
        return <Type>ReflectUtil.getType(type.prototype, propertyName);
    }

    private _findEmbeddedTypes(type: Type): void {

        if(!this._isArray(type) && !this._getTypeLinks(type)) {
            this._addError("Invalid type '"+ type.name +"'. All referenced classes must belong to an inheritance hierarchy annotated with @Entity or @Embeddable, or annotated with @Converter.");
            return;
        }

        if(this._getTypeLinks(type)) {
            return;
        }

        // TODO: handle scanning indexed types
        // TOOD: Handle Tuple?
        /*
        if(type.isTuple()) {
            var elementTypes = type.getElementTypes();
            for(var i = 0, l = elementTypes.length; i < l; i++) {
                this._findEmbeddedTypes(elementTypes[i]);
            }
            return;
        }
        */

        // TODO: Handle interface types?
        /*
        this._addObjectType(type, MappingKind.Embeddable);
        this._scanPropertiesForEmbeddedTypes(type);
        */
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
                var annotation = ReflectUtil.getClassAnnotations(type, EntityAnnotation)[0] || ReflectUtil.getClassAnnotations(type, EmbeddableAnnotation)[0];
                this._addAnnotationError(type, annotation, "Only one class per inheritance hierarchy can have the @Entity or @Embeddable annotation.");
            }
        }
    }

    private _subclassMarkedAsRootType(type: Type): boolean {

        var links = this._getTypeLinks(type);
        if(links.kind != MappingKind.RootEntity && links.kind != MappingKind.RootEmbeddable) {
            return false;
        }

        var baseClass = ReflectUtil.getBaseType(type);
        while(baseClass) {
            var links = this._getTypeLinks(baseClass);
            if(links && (links.kind == MappingKind.RootEntity || links.kind == MappingKind.RootEmbeddable)) {
                return true;
            }
            baseClass = ReflectUtil.getBaseType(baseClass);
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
                if(typeof type === "function") {
                    mapping = Mapping.createClassMapping(this._getParentMapping(type));
                }
                else {
                    mapping = Mapping.createObjectMapping();
                }
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
                mapping = this._createConverterMapping(ReflectUtil.getClassAnnotations(type, ConverterAnnotation)[0]);
                break;
        }

        return links.mapping = mapping;
    }

    private _getParentMapping(type: Type): Mapping.ClassMapping {

        var baseClass = ReflectUtil.getBaseType(type);
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
        var annotations = ReflectUtil.getClassAnnotations(type);
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
        mapping.classConstructor = <any>type;

        // get type level annotations
        var annotations = ReflectUtil.getClassAnnotations(type);
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

        // process all properties in the type
        var propertyNames = ReflectUtil.getPropertyNames(type);

        for(var i = 0; i < propertyNames.length; i++) {
            var propertyName = propertyNames[i];

            try {
                var property = this._createProperty(mapping, type, propertyName);
                if(property) {
                    // add to mapping after property has been fully initialized
                    mapping.addProperty(property);
                }
            }
            catch(e) {
                this._addError("Invalid property '" + propertyName + "' on type '" + type.name + "': " + e.message);
                return null;
            }
        }

        // TODO: handle what addDefaultMapping did
        //mapping.addDefaultMappings(this.config);

        // The mapping holds all properties inlcuding the properties for it's base types so populate those as well.
        var baseType = ReflectUtil.getBaseType(type);
        if(baseType) {
            this._populateObjectMapping(mapping, baseType);
        }

        return mapping;
    }

    private _createProperty(mapping: Mapping, parentType: Type, propertyName: string): Mapping.Property {

        try {
            var propertyMapping = this._createPropertyMapping(parentType, propertyName);
        }
        catch(e) {
            this._addError("Error creating property '" + propertyName + "' of type '" + parentType.name + "': " + e.message);
            return null;
        }

        var property = Mapping.createProperty(propertyName, propertyMapping);

        // process all property annotations
        var annotations = ReflectUtil.getPropertyAnnotations(parentType, propertyName),
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
            this._addPropertyAnnotationError(parentType, property, annotation, e.message);
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
                this._addPropertyAnnotationError(parentType, property, indexAnnotation, e.message);
            }
        }

        return property;
    }

    private _createPropertyMapping(parentType: Type, propertyName: string): Mapping {

        if(ReflectUtil.hasPropertyAnnotation(parentType, propertyName, ConverterAnnotation)) {
            return this._createConverterMapping(ReflectUtil.getPropertyAnnotations( parentType, propertyName, ConverterAnnotation)[0]);
        }

        var propertyType = this._getPropertyType(parentType, propertyName);
        if(!propertyType) {
            this._addError("Invalid property '" + propertyName + "' on type '" + parentType.name + "': Unable to determine type of property. This may be because of a circular reference. Try adding @EmbedOne or @ReferenceOne annotation with the name of the class as the target.");
            return;
        }

        if(ReflectUtil.hasPropertyAnnotation(parentType, propertyName, EnumeratedAnnotation)) {
            return this._createEnumMapping(propertyType, ReflectUtil.getPropertyAnnotations(parentType, propertyName, EnumeratedAnnotation)[0]);
        }

        if(this._isArray(propertyType)) {
            var referencedAnnotation = ReflectUtil.getPropertyAnnotations(parentType, propertyName, ReferenceManyAnnotation)[0];
            if(referencedAnnotation) {
                var mapping = this._createTypeMapping(referencedAnnotation.target);
                if(!(mapping.flags & MappingFlags.Entity)) {
                    throw new Error("Target of @ReferenceMany annotation must be an Entity.");
                }
                return Mapping.createArrayMapping(mapping);
            }

            var embeddedAnnotation = ReflectUtil.getPropertyAnnotations(parentType, propertyName, EmbedManyAnnotation)[0];
            if(embeddedAnnotation) {
                var mapping = this._createTypeMapping(embeddedAnnotation.target);
                if(!(mapping.flags & (MappingFlags.Embeddable | MappingFlags.Boolean | MappingFlags.String | MappingFlags.Number | MappingFlags.Enum | MappingFlags.RegExp | MappingFlags.Date | MappingFlags.Buffer))) {
                    throw new Error("Target of @EmbedMany annotation must be a built-in type or a class annotated with @Embeddable.");
                }
                return Mapping.createArrayMapping(mapping);
            }

            throw new Error("Properties with array types must be annotated with @ReferenceMany or @EmbedMany.");
        }

        // TODO: Handle Tuple mapping
        /*
        if(type.isTuple()) {
            return Mapping.createTupleMapping(type.getElementTypes().map(type => this._createPropertyMapping(type)));
        }
        */

        return this._createTypeMapping(propertyType);
    }

    private _isArray(type: Type): boolean {

        return type && type.name === "Array";
    }

    private _getCollectionElementType(type: Type, propertyName: string): Type {

        var target: Type | string;

        var referencedAnnotation = ReflectUtil.getPropertyAnnotations(type, propertyName, ReferenceManyAnnotation)[0];
        if(referencedAnnotation) {
            target = referencedAnnotation.target;
        }
        else {
            var embeddedAnnotation = ReflectUtil.getPropertyAnnotations(type, propertyName, EmbedManyAnnotation)[0];
            if (embeddedAnnotation) {
                target = embeddedAnnotation.target;
            }
        }

        return this._resolveType(target);
    }

    private _createTypeMapping(target: Type | string): Mapping {

        var type = this._resolveType(target);

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

        if(type !== Number) {
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

    private _addPropertyAnnotationError(type: Type, property: Mapping.Property, annotation: any, message: string): void {

        this._addError("Invalid annotation '" + (annotation && annotation.constructor.name) + "' on property '" + property.name + "' of type '" + type.name + "': " + message);
    }

    private _addError(message: string): void {

        this._errors.push(message);
    }
}
