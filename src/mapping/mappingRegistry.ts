import {ClassMapping} from "./classMapping";
import {EntityMapping} from "./entityMapping";
import {Constructor} from "../core/constructor";
import {MappingFlags} from "./mappingFlags";

export class MappingRegistry {

    private _mappingByConstructor: WeakMap<Function, ClassMapping> = new WeakMap();
    private _mappings: ClassMapping[] = [];

    addMappings(mappings: ClassMapping[]): void {

        mappings.forEach(x => this.addMapping(x));
    }

    addMapping(mapping: ClassMapping): void {

        if(!mapping.classConstructor) {
            throw new Error("Class mapping is missing classConstructor.");
        }

        if(this._mappingByConstructor.has(mapping.classConstructor)) {
            throw new Error("Mapping '" + mapping.name + "' has already been registered.");
        }

        this._mappingByConstructor.set(mapping.classConstructor, mapping);
        this._mappings.push(mapping);
    }

    getMappingForObject(obj: any): ClassMapping {

        return this.getMappingForConstructor(obj.constructor);
    }

    getMappingForConstructor(ctr: Constructor<any>): ClassMapping {

        if(ctr) {
            return this._mappingByConstructor.get(<any>ctr);
        }
    }
}
