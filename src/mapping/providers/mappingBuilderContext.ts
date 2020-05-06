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

    currentTypeName: string;
    currentProperty: Property;
    currentMethod: Method;
    currentAnnotation: any;

    private _builders: Map<string, MappingBuilder> = new Map();
    private _reflect: ReflectContext;

    constructor(config: Configuration) {
        this.config = config;
        this._reflect = new ReflectContext();
    }

    populateMappings(): MappingModel.ClassMapping[] {

        var classMappings: MappingModel.ClassMapping[] = [];

        // construct mappings
        this._builders.forEach(mappedType => {

            this.currentTypeName = mappedType.name;
            mappedType.construct();

            if(mappedType.mapping.flags & MappingModel.MappingFlags.Class) {
                classMappings.push(<MappingModel.ClassMapping>mappedType.mapping);
            }
        });
        this.currentTypeName = null;

        // populate mappings
        this._builders.forEach(mappedType => {

            this.currentTypeName = mappedType.name;
            mappedType.populate();
        });

        this.currentTypeName = null;

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
        else if (this.currentTypeName) {

            message = `Error processing type '${this.currentTypeName}': ${message}`
        }

        this.errors.push(message);
    }

    getType(type: Constructor<any>): Type {

        return this._reflect.getType(<Constructor<any>>type);
    }

    addBuilder(mappedType: MappingBuilder): void {

        if(!mappedType) return;

        if(this._builders.has(mappedType.name)) {
            this.addError("Duplicate class name '" + mappedType.name + "'. All types must have unique names.");
        }
        this._builders.set(mappedType.name, mappedType);
    }

    getBuilder(target: Type | Constructor<any> | string): MappingBuilder {

        if(!target) return null;

        return this._builders.get(typeof target === "string" ? target : target.name);
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
