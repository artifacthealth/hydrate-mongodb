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
import {MappedTypeContext} from "./mappedTypeContext";
import {MappedType} from "./mappedType";
import {ClassMappedType} from "./classMappedType";
import {EntityMappedType} from "./entityMappedType";

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

export class AnnotationMappingProvider implements MappingProvider {

    private _modules: Object[] = [];

    constructor(modules?: Object | Object[]) {

        if (modules) {
            if (!Array.isArray(modules)) {
                modules = [<Object>modules];
            }
            this.addModules(<Object[]>modules);
        }
    }

    addModule(module: Object): void {

        if (module) {
            this._modules.push(module);
        }
    }

    addModules(modules: Object[]): void {

        if (modules) {
            for (let module of modules) {
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

        var builder = new MappingBuilder(config);
        var mappings = builder.build(this._modules);

        if (builder.hasErrors) {
            callback(new Error(builder.getErrorMessage()), null);
        }
        else {
            callback(null, mappings);
        }
    }
}

class MappingBuilder {

    private _context: MappedTypeContext;

    constructor(config: Configuration) {

        this._context = new MappedTypeContext(config);
    }

    build(modules: Object[]): Mapping.ClassMapping[] {

        // create global mappings
        this._addGlobalMapping("String", Mapping.createStringMapping());
        this._addGlobalMapping("Number", Mapping.createNumberMapping());
        this._addGlobalMapping("Boolean", Mapping.createBooleanMapping());
        this._addGlobalMapping("Date", Mapping.createDateMapping());
        this._addGlobalMapping("RegExp", Mapping.createRegExpMapping());
        this._addGlobalMapping("Buffer", Mapping.createBufferMapping());

        for(let module of modules) {
            this._processModule(module);
        }

        this._context.populateMappings();

        return this._context.getClassMappings();
    }

    get hasErrors(): boolean {
        return this._context.errors.length > 0;
    }

    getErrorMessage(): string {
        return "Unable to build type mappings from declaration files:\n" + this._context.errors.join("\n");
    }

    private _addGlobalMapping(name: string, mapping: Mapping): void {

        var ctr = (<any>global)[name];
        if(!ctr) {
            throw new Error("Could not find global type '" + name + '.');
        }

        var type = this._context.getType(ctr);

        this._context.addMappedType(new MappedType(this._context, type, mapping));
    }

    private _processModule(obj: any): void {

        // check to see if the export is an Entity or Embeddable type
        if(typeof obj === "function") {
            this._findTypes(this._context.getType(obj));
        }
        else if (typeof obj !== "object") {
            return;
        }

        // search exports for types
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                this._processModule(obj[p]);
            }
        }
    }

    private _findTypes(type: Type): void {

        if(!type || type.isCollection || this._context.hasMappedType(type)) {
            return;
        }

        // if the type has a converter then no further processing is needed here
        if(type.hasAnnotation(ConverterAnnotation)) {
            this._addObjectMapping(type, MappingKind.Converted);
            return;
        }

        // process mappings for any base type first
        if(type.baseType) {
            this._findTypes(type.baseType);
        }

        if(type.hasAnnotation(EntityAnnotation, true)) {
            this._addObjectMapping(type, type.hasAnnotation(EntityAnnotation) ? MappingKind.RootEntity : MappingKind.Entity);
        }
        else if(type.hasAnnotation(EmbeddableAnnotation, true)) {
            this._addObjectMapping(type, type.hasAnnotation(EmbeddableAnnotation) ? MappingKind.RootEmbeddable : MappingKind.Embeddable);
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
            return this._context.getType(<Constructor<any>>target);
        }

        return property.type;
    }

    private _addObjectMapping(type: Type, kind: MappingKind): void {

        var mappedType: MappedType;

        switch(kind) {
            case MappingKind.RootEmbeddable:
                mappedType = new ClassMappedType(this._context, type, Mapping.createClassMapping());
                break;
            case MappingKind.Embeddable:
                var parentMapping = this._getParentMapping(type);
                if(parentMapping && (parentMapping.flags & MappingFlags.Embeddable) == 0) {
                    this._context.addError("Parent of mapping for '" + type.name + "' must be an embeddable mapping.");
                }
                mappedType = new ClassMappedType(this._context, type, Mapping.createClassMapping(parentMapping));
                break;
            case MappingKind.RootEntity:
                mappedType = new EntityMappedType(this._context, type, Mapping.createEntityMapping());
                break;
            case MappingKind.Entity:
                var parentMapping = this._getParentMapping(type);
                if(parentMapping && (parentMapping.flags & MappingFlags.Entity) == 0) {
                    this._context.addError("Parent of mapping for '" + type.name + "' must be an entity mapping.");
                }
                mappedType = new EntityMappedType(this._context, type, Mapping.createEntityMapping((<Mapping.EntityMapping>parentMapping)));
                break;
            case MappingKind.Converted:
                mappedType = new MappedType(this._context, type, type.getAnnotations(ConverterAnnotation)[0].createConverterMapping(this._context));
                break;
        }

        if(mappedType) {
            this._context.addMappedType(mappedType)
        }
    }

    private _getParentMapping(type: Type): Mapping.ClassMapping {

        var baseType = type.baseType;
        if(baseType) {
            var links = this._context.getMappedType(baseType);
            if(links) {
                var mapping = links.mapping
                if (!mapping) {
                    // this should not happen since the base type is processed first
                    throw new Error("Could not find parent mapping for '" + type.name + "'.");
                }

                if ((mapping.flags & MappingFlags.Class) == 0) {
                    this._context.addError("Parent of mapping for '" + type.name + "' must be a class mapping.");
                    return undefined;
                }

                return <Mapping.ClassMapping>links.mapping;
            }
        }
    }
}
