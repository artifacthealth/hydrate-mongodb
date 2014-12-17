/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import TypeMapping = require("./typeMapping");
import TypeMappingFlags = require("./typeMappingFlags");
import Constructor = require("../constructor");
import Map = require("../map");

class MappingRegistry {

    private _mappingByType: TypeMapping[] = [];
    private _mappingByConstructor: Map<TypeMapping> = {};

    constructor(mappings: TypeMapping[]) {

        for(var i = 0, l = mappings.length; i < l; i++) {
            var mapping = mappings[i];

            this._mappingByType[mapping.type.getId()] = mapping;

            if(mapping.type.isClass()) {
                if(!mapping.classConstructor) {
                    throw new Error("Class mapping is missing classConstructor.");
                }
                this._mappingByConstructor[Map.getHashCode(mapping.classConstructor)] = mapping;
            }
        }
    }

    getMappingForType(type: reflect.Type): TypeMapping {

        return this._mappingByType[type.getId()];
    }

    getMappingForObject(obj: any): TypeMapping {

        return this.getMappingForConstructor(obj.constructor);
    }

    getMappingForConstructor(ctr: Constructor<any>): TypeMapping {

        if(ctr) {
            return Map.getProperty(this._mappingByConstructor, Map.getHashCode(ctr));
        }
    }
}

export = MappingRegistry;