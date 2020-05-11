import {ClassMapping} from "./classMapping";
import {EntityMapping} from "./entityMapping";
import {Constructor} from "../index";
import {MappingModel} from "./mappingModel";
import {PersistenceError} from "../persistenceError";

/**
 * @hidden
 */
export class MappingRegistry {

    private _mappings: Map<string, ClassMapping> = new Map();

    addMappings(mappings: ClassMapping[]): void {

        mappings.forEach(x => this.addMapping(x));
    }

    addMapping(mapping: ClassMapping): void {

        if(!mapping.classConstructor) {
            throw new PersistenceError("Class mapping is missing classConstructor.");
        }

        if(!mapping.name) {
            throw new PersistenceError("Class mapping is missing name.");
        }

        if(this._mappings.has(mapping.name)) {
            throw new PersistenceError("Mapping '" + mapping.name + "' has already been registered.");
        }

        this._mappings.set(mapping.name, mapping);
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

    getMappingForConstructor(ctr: Constructor<any> | string): ClassMapping {

        if(ctr) {
            return this._mappings.get(typeof ctr === "string" ? ctr : ctr.name);
        }
    }
}
