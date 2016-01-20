import {Configuration} from "../../config/configuration";
import {Type, Property, ReflectContext} from "reflect-helper";
import {Constructor} from "../../core/constructor";
import {MappingBuilder} from "./mappingBuilder";
import {MappingModel} from "../mappingModel";
import {MappingFlags} from "../mappingFlags";

export class MappingBuilderContext {

    config: Configuration;
    errors: string[] = [];

    currentType: Type;
    currentProperty: Property;
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

            if(mappedType.mapping.flags & MappingFlags.Class) {
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

        if(this.currentProperty) {

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
}