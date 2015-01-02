import ClassMapping = require("./classMapping");
import EntityMapping = require("./entityMapping");
import Constructor = require("../core/constructor");
import Map = require("../core/map");
import Mapping = require("./mapping");
import MappingFlags = require("./mappingFlags");

class MappingRegistry {

    private _mappingByConstructor: Map<ClassMapping> = {};

    addMapping(mapping: ClassMapping): void {

        if(!mapping.classConstructor) {
            throw new Error("Class mapping is missing classConstructor.");
        }

        var key = Map.getHashCode(mapping.classConstructor);
        if(Map.hasProperty(this._mappingByConstructor, key)) {
            throw new Error("Mapping '" + mapping.name + "' has already been registered.");
        }
        this._mappingByConstructor[key] = mapping;
       // (<any>entityMapping.classConstructor)["mapping"] = mapping;
    }

    getEntityMappings(): EntityMapping[] {

        var mappings: EntityMapping[] = [];

        for(var key in this._mappingByConstructor) {
            if(this._mappingByConstructor.hasOwnProperty(key)) {
                var mapping = this._mappingByConstructor[key];
                if(mapping.flags & MappingFlags.Entity) {
                    mappings.push(<EntityMapping>mapping);
                }
            }
        }

        return mappings;
    }

    getMappings(): ClassMapping[] {

        var mappings: ClassMapping[] = [];

        for(var key in this._mappingByConstructor) {
            if(this._mappingByConstructor.hasOwnProperty(key)) {
                mappings.push(this._mappingByConstructor[key]);
            }
        }

        return mappings;
    }

    getMappingForObject(obj: any): ClassMapping {

        return this.getMappingForConstructor(obj.constructor);
    }

    getMappingForConstructor(ctr: Constructor<any>): ClassMapping {

        if(ctr) {
            return this._mappingByConstructor[Map.getHashCode(ctr)];
        }
    }
}

export = MappingRegistry;