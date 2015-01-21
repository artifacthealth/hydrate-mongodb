import ClassMapping = require("./classMapping");
import EntityMapping = require("./entityMapping");
import Constructor = require("../core/constructor");
import Table = require("../core/table");
import TableKey = require("../core/tableKey");
import Mapping = require("./mapping");
import MappingFlags = require("./mappingFlags");

class MappingRegistry {

    private _mappingByConstructor: ClassMapping[] = [];
    private _key = new TableKey();

    addMapping(mapping: ClassMapping): void {

        if(!mapping.classConstructor) {
            throw new Error("Class mapping is missing classConstructor.");
        }

        if(this._key.hasValue(mapping.classConstructor)) {
            throw new Error("Mapping '" + mapping.name + "' has already been registered.");
        }

        this._mappingByConstructor[this._key.ensureValue(mapping.classConstructor)] = mapping;
    }

    getEntityMappings(): EntityMapping[] {

        return <EntityMapping[]>this._mappingByConstructor.filter(mapping => (mapping.flags & MappingFlags.Entity) !== 0);
    }

    getMappings(): ClassMapping[] {

        return this._mappingByConstructor;
    }

    getMappingForObject(obj: any): ClassMapping {

        return this.getMappingForConstructor(obj.constructor);
    }

    getMappingForConstructor(ctr: Constructor<any>): ClassMapping {

        if(ctr) {
            return this._mappingByConstructor[this._key.getValue(ctr)];
        }
    }
}

export = MappingRegistry;