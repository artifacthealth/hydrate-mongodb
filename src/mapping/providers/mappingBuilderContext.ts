import {Configuration} from "../../config/configuration";
import {Type, Property, ReflectContext, Method} from "reflect-helper";
import {Constructor} from "../../index";
import {MappingBuilder} from "./mappingBuilder";
import {MappingModel} from "../mappingModel";

/**
 * @hidden
 */
export class MappingBuilderContext {

    config: Configuration;
    errors: string[] = [];

    currentType: Type;
    currentProperty: Property;
    currentMethod: Method;
    currentAnnotation: any;

    private _builders: Map<Type, MappingBuilder> = new Map();
    private _typesByName: Map<string, Type> = new Map();
    private _reflect: ReflectContext;

    constructor(config: Configuration) {
        this.config = config;
        this._reflect = new ReflectContext();
    }

    populateMappings(): MappingModel.ClassMapping[] {

        var classMappings: MappingModel.ClassMapping[] = [];

        this._builders.forEach(mappedType => {

            this.currentType = mappedType.type;
            mappedType.populate();

            if(mappedType.mapping.flags & MappingModel.MappingFlags.Class) {
                classMappings.push(<MappingModel.ClassMapping>mappedType.mapping);
            }
        });

        this.currentType = null;

        return classMappings;
    }

    addError(message: string): void {

        if(this.currentAnnotation) {
            message = `Invalid annotation ${this.currentAnnotation.toString()}: ${message}`;
        }

        if(this.currentMethod) {

            message = `Error processing method '${this.currentMethod.name}' on type '${this.currentMethod.parent.name}': ${message}`;
        }
        else if(this.currentProperty) {

            message = `Error processing property '${this.currentProperty.name}' on type '${this.currentProperty.parent.name}': ${message}`;
        }
        else if (this.currentType) {

            message = `Error processing type '${this.currentType.name}': ${message}`
        }

        this.errors.push(message);
    }

    getType(type: Constructor<any> | string): Type {

        if(typeof type === "string") {
            var resolved = this._typesByName.get(type);
            if(!resolved) {
                this.addError("Unknown type '" + type + "'.");
                return;
            }

            return resolved;
        }

        return this._reflect.getType(<Constructor<any>>type);
    }

    addBuilder(mappedType: MappingBuilder): void {

        if(!mappedType) return;

        if(this._typesByName.has(mappedType.type.name)) {
            this.addError("Duplicate class name '" + mappedType.type.name + "'. All named types must have unique names.");
        }
        this._typesByName.set(mappedType.type.name, mappedType.type);
        this._builders.set(mappedType.type, mappedType);
    }

    getBuilder(type: Type): MappingBuilder {

        if(!type) return null;

        return this._builders.get(type);
    }

    hasBuilder(type: Type): boolean {

        return this._builders.has(type);
    }

    assertClassMapping(mapping: MappingModel.Mapping): boolean {

        if(!(mapping.flags & MappingModel.MappingFlags.Class)) {
            this.addError("Annotation can only be defined on class mappings.");
            return false;
        }
        return true;
    }

    assertEmbeddableMapping(mapping: MappingModel.Mapping): boolean {

        if((mapping.flags & MappingModel.MappingFlags.Embeddable) === 0) {
            this.addError("Annotation can only be defined an embeddable class.");
            return false;
        }
        return true;
    }

    assertRootClassMapping(mapping: MappingModel.Mapping): boolean {

        if(!this.assertClassMapping(mapping)) return false;

        var classMapping = <MappingModel.ClassMapping>mapping;
        if(!(classMapping.flags & MappingModel.MappingFlags.InheritanceRoot)) {
            this.addError("Annotation can only be defined on classes that are the root of a mapped inheritance hierarchy.");
        }
        return true;
    }

    assertRootEntityMapping(mapping: MappingModel.Mapping): boolean {

        if(!this.assertEntityMapping(mapping)) return false;

        return this.assertRootClassMapping(mapping);
    }

    assertEntityMapping(mapping: MappingModel.Mapping): boolean {

        if(!(mapping.flags & MappingModel.MappingFlags.Entity)) {
            this.addError("Annotation can only be defined on entities.");
            return false;
        }
        return true;
    }
}