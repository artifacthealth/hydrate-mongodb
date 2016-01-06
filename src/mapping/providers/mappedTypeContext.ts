import {Configuration} from "../../config/configuration";
import {Type} from "../../core/type";
import {Symbol} from "../../core/symbol";
import {ReflectContext} from "../../core/reflectContext";
import {Constructor} from "../../core/constructor";
import {MappedType} from "./mappedType";
import {Mapping} from "../mapping";
import {MappingFlags} from "../mappingFlags";
import {ClassMapping} from "../classMapping";

export class MappedTypeContext {

    config: Configuration;
    errors: string[] = [];

    private _typeTable: Map<Type, MappedType> = new Map();
    private _typesByName: Map<string, Type> = new Map();
    private _reflect: ReflectContext;

    constructor(config: Configuration) {
        this.config = config;
        this._reflect = new ReflectContext();
    }

    populateMappings(): void {

        this._typeTable.forEach(mappedType => mappedType.populate());
    }

    addAnnotationError(type: Type, annotation: any, message: string): void {

        this.addError("Invalid annotation '" + (annotation && annotation.constructor.name) + "' on '" + type.name + "': " + message);
    }

    addPropertyAnnotationError(symbol: Symbol, annotation: any, message: string): void {

        this.addError("Invalid annotation '" + (annotation && annotation.constructor.name) + "' on property '" + symbol.name + "' of type '" + symbol.parent.name + "': " + message);
    }

    addError(message: string): void {

        this.errors.push(message);
    }

    getType(type: Constructor<any> | string): Type {

        if(typeof type === "string") {
            var resolved = this._typesByName.get(type);
            if(!resolved) {
                throw new Error("Unknown type '" + type + "'.");
            }
            return resolved;
        }

        return this._reflect.getType(<Constructor<any>>type);
    }

    addMappedType(mappedType: MappedType): void {

        if(this._typesByName.has(mappedType.type.name)) {
            throw new Error("Duplicate class name '" + mappedType.type.name + "'. All named types must have unique names.");
        }
        this._typesByName.set(mappedType.type.name, mappedType.type);
        this._typeTable.set(mappedType.type, mappedType);
    }

    getMappedType(type: Type): MappedType {

        if(!type) return null;

        return this._typeTable.get(type);
    }

    hasMappedType(type: Type): boolean {

        return this._typeTable.has(type);
    }

    getClassMappings(): Mapping.ClassMapping[] {

        var classMappings: Mapping.ClassMapping[] = [];
        this._typeTable.forEach(mappedType => {
            if(mappedType.mapping.flags & MappingFlags.Class) {
                classMappings.push(<ClassMapping>mappedType.mapping);
            }
        });

        return classMappings;
    }
}