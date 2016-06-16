import * as async from "async";
import * as path from "path";
import {absolutePath, hasExtension} from "../../core/fileUtil";
import {ResultCallback} from "../../core/callback";
import {MappingRegistry} from "../mappingRegistry";
import {Index} from "../index";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../mappingModel";
import {EnumType} from "../enumType";
import {MappingModel} from "../mappingModel";
import {MappingProvider, Configuration} from "../../config/configuration";
import {ReflectContext, Type, Property} from "reflect-helper";
import {MappingBuilderAnnotation,TargetClassAnnotation} from "./annotations";
import {Constructor} from "../../index";
import {MappingBuilderContext} from "./mappingBuilderContext";
import {MappingBuilder} from "./mappingBuilder";
import {ClassMappingBuilder} from "./classMappingBuilder";
import {EntityMappingBuilder} from "./entityMappingBuilder";
import {PersistenceError} from "../../persistenceError";

export class AnnotationMappingProvider implements MappingProvider {

    /**
     * @hidden
     */
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

    // TODO: support UUID for _id in addition to ObjectID?  I believe it's universally unique just like ObjectID so shouldn't be a big deal to support.
    // TODO: any special mapping for enumerations? allowing changing persisted value, etc.
    // TODO: have a plan for supporting all these data types: http://docs.mongodb.org/manual/reference/bson-types/

    getMapping(config: Configuration, callback: ResultCallback<MappingModel.ClassMapping[]>): void {

        var builder = new Builder(config);
        var mappings = builder.build(this._modules);

        if (builder.hasErrors) {
            callback(new PersistenceError(builder.getErrorMessage()), null);
        }
        else {
            callback(null, mappings);
        }
    }
}

class Builder {

    private _context: MappingBuilderContext;
    private _seenTypes = new Set<any>();

    constructor(config: Configuration) {

        this._context = new MappingBuilderContext(config);
    }

    build(modules: Object[]): MappingModel.ClassMapping[] {

        // create global mappings
        this._addGlobalMapping("String", MappingModel.createStringMapping());
        this._addGlobalMapping("Number", MappingModel.createNumberMapping());
        this._addGlobalMapping("Boolean", MappingModel.createBooleanMapping());
        this._addGlobalMapping("Date", MappingModel.createDateMapping());
        this._addGlobalMapping("RegExp", MappingModel.createRegExpMapping());
        this._addGlobalMapping("Buffer", MappingModel.createBufferMapping());

        for(let module of modules) {
            this._processModule(module);
        }

        return this._context.populateMappings();
    }

    get hasErrors(): boolean {
        return this._context.errors.length > 0;
    }

    getErrorMessage(): string {
        return "Unable to build type mappings:\n" + this._context.errors.join("\n");
    }

    private _addGlobalMapping(name: string, mapping: MappingModel.Mapping): void {

        var ctr = (<any>global)[name];
        if(!ctr) {
            this._context.addError("Could not find global type '" + name + '.');
            return;
        }

        var type = this._context.getType(ctr);
        this._context.addBuilder(new MappingBuilder(this._context, type, mapping));
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

        if(!type || this._seenTypes.has(type)) {
            return;
        }

        this._seenTypes.add(type);

        // process mappings for any base type first
        if(type.baseType) {
            this._findTypes(type.baseType);
        }

        for(let annotation of <MappingBuilderAnnotation[]>type.getAnnotations()) {
            if(annotation.createBuilder) {
                this._context.addBuilder(annotation.createBuilder(this._context, type));
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

    private _getPropertyTypeToScan(property: Property): Type {

        for(let annotation of <TargetClassAnnotation[]>property.getAnnotations()) {
            if(annotation.target) {
                // Since this is used for type discovery, we are not interested in types indicated by name.
                if(typeof annotation.target === "string") {
                    return null;
                }
                return this._context.getType(<Constructor<any>>annotation.target);
            }
        }

        return property.type;
    }
}
