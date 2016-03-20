import {ClassMapping} from "./classMapping";
import {EntityMapping} from "./entityMapping";
import {Constructor} from "../index";
import {MappingModel} from "./mappingModel";

/**
 * @hidden
 */
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
            throw new Error("Mapping '" + mapping.classConstructor.name + "' has already been registered.");
        }

        this._mappings.set(mapping.classConstructor, mapping);
    }

    getEntityMappings(): EntityMapping[] {

        var entities: EntityMapping[] = [];

        this._mappings.forEach((mapping) => {

            if((mapping.flags & MappingModel.MappingFlags.Entity) != 0) {
                entities.push(<EntityMapping>mapping);
            }
        });

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
