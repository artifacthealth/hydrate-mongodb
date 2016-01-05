import {ClassMapping} from "./classMapping";
import {EntityMapping} from "./entityMapping";
import {Constructor} from "../core/constructor";
import {MappingFlags} from "./mappingFlags";

export class MappingRegistry {

    private _mappings: Map<Function, ClassMapping> = new Map();

    addMappings(mappings: ClassMapping[]): void {

        mappings.forEach(x => this.addMapping(x));
    }

    addMapping(mapping: ClassMapping): void {

        if(!mapping.classConstructor) {
            throw new Error("Class mapping is missing classConstructor.");
        }

        if(this._mappings.has(mapping.classConstructor)) {
            throw new Error("Mapping '" + mapping.name + "' has already been registered.");
        }

        this._mappings.set(mapping.classConstructor, mapping);
    }

    getEntityMappings(): EntityMapping[] {

        var entities: EntityMapping[] = [];

        for(var mapping in this._mappings.values()) {

            if((mapping.flags & MappingFlags.Entity) != 0) {
                entities.push(mapping);
            }
        }

        return entities;
    }

    getMappingForObject(obj: any): ClassMapping {

        return this.getMappingForConstructor(obj.constructor);
    }

    getMappingForConstructor(ctr: Constructor<any>): ClassMapping {

        if(ctr) {
            return this._mappings.get(<any>ctr);
        }
    }
}
