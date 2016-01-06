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
import {MappedTypeAnnotation,TargetClassAnnotation} from "./annotations";
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

        return this._context.populateMappings();
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

        // process mappings for any base type first
        if(type.baseType) {
            this._findTypes(type.baseType);
        }

        for(let annotation of <MappedTypeAnnotation[]>type.getAnnotations()) {
            if(annotation.createMappedType) {
                this._context.addMappedType(annotation.createMappedType(this._context, type));
                break;
            }
        }

        this._scanPropertiesForTypes(type);
    }

    private _scanPropertiesForTypes(type: Type): void {

        for(var property of type.properties) {
            this._findTypes(this._getPropertyTypeToScan(property));
        }
    }

    private _getPropertyTypeToScan(property: Symbol): Type {

        for(let annotation of <TargetClassAnnotation[]>property.getAnnotations()) {
            if(annotation.target) {
                // Since this is used for type discovery, we are not interested in types indicated by name.
                if(typeof annotation.target === "string") {
                    return null;
                }
                return this._context.getType(<Constructor<any>>annotation.target);
                break;
            }
        }

        return property.type;
    }
}
