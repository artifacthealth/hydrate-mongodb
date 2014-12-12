/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import TypeMapping = require("./typeMapping");
import PropertyFlags = require("./propertyFlags");
import Configuration = require("../config/Configuration");

class Property {

    /**
     * The name of the property.
     */
    name: string;

    /**
     * The property flags.
     */
    flags: PropertyFlags;

    /**
     * The name of the database document field.
     */
    field: string

    /**
     * The property in the target TypeMapping that is used to retrieve the value of this property.
     */
    inverseOf: Property


    /**
     * Constructs a Property object
     * @param symbol The Symbol for the property
     */
    constructor(public symbol: reflect.Symbol) {

        this.name = symbol.getName();
    }

    setFlags(flags: PropertyFlags): void {

        if(this.flags === undefined) {
            this.flags = flags;
        }
        else {
            this.flags |= flags;
        }
    }

    /**
     * Adds default mapping values for Property. Called by MappingProvider after Property is created.
     * @param config The configuration.
     */
    addDefaultMappings(config: Configuration): void {

        if(!this.field && !(this.flags & PropertyFlags.Ignored)) {
            // TODO: configurable naming strategy for when name is not specified?
            this.field = this.name;
        }
    }
}

export = Property;