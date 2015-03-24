import ArrayMapping = require("./arrayMapping");
import BooleanMapping = require("./booleanMapping");
import ClassMappingImpl = require("./classMapping");
import DateMapping = require("./dateMapping");
import EntityMappingImpl = require("./entityMapping");
import EnumMapping = require("./enumMapping");
import NumberMapping = require("./numberMapping");
import ObjectMappingImpl = require("./objectMapping");
import RegExpMapping = require("./regExpMapping");
import StringMapping = require("./stringMapping");
import TupleMapping = require("./tupleMapping");
import MappingFlags = require("./mappingFlags");
import InternalMapping = require("./internalMapping");
import PropertyFlags = require("./propertyFlags");
import PropertyImpl = require("./property");
import Index = require("./index");
import IndexOptions = require("./indexOptions");
import CollectionOptions = require("./collectionOptions");
import ChangeTracking = require("./changeTracking");
import IdentityGenerator = require("../id/identityGenerator");

interface Mapping {
    id: number;
    flags: MappingFlags;
}

module Mapping {

    export interface EnumMembers {

        [name: string]: number;
    }

    export interface Property {

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
         * The name of the property in the target TypeMapping that is used to retrieve the value of this property.
         */
        inverseOf: string;

        /**
         * The mapping of the property.
         */
        mapping: Mapping;

        setFlags(flags: PropertyFlags): void;
    }

    export interface ObjectMapping extends Mapping {

        addProperty(property: Property): void;
        getProperty(name: string): Property;
    }

    export interface ClassMapping extends ObjectMapping {

        name: string;
        discriminatorField: string;
        discriminatorValue: string;
        classConstructor: Function;

        hasSubClasses: boolean;
        hasBaseClass: boolean;

        setDiscriminatorValue(value: string): void;
    }

    export interface EntityMapping extends ClassMapping {

        collectionName: string;
        databaseName: string;
        indexes: Index[];
        collectionOptions: CollectionOptions;

        identity: IdentityGenerator;

        changeTracking: ChangeTracking;

        versioned: boolean;
        versionField: string;

        lockable: boolean;
        lockField: string;

        addIndex(index: Index): void;
    }

    export function createProperty(name: string, mapping: Mapping): Property {
        if(!name) {
            throw new Error("Missing required argument 'name'.");
        }
        if(!mapping) {
            throw new Error("Missing required argument 'mapping'.");
        }
        return new PropertyImpl(name, <InternalMapping>mapping);
    }

    export function createArrayMapping(elementMapping: Mapping): Mapping {
        if(!elementMapping) {
            throw new Error("Missing required argument 'elementMapping'.");
        }
        return new ArrayMapping(<InternalMapping>elementMapping);
    }

    export function createBooleanMapping(): Mapping {
        return new BooleanMapping();
    }

    export function createClassMapping(baseClass?: ClassMapping): ClassMapping {
        return new ClassMappingImpl(<ClassMappingImpl>baseClass);
    }

    export function createDateMapping(): Mapping {
        return new DateMapping();
    }

    export function createEntityMapping(baseClass?: EntityMapping): EntityMapping {
        return new EntityMappingImpl(<EntityMappingImpl>baseClass);
    }

    export function createEnumMapping(members: EnumMembers): Mapping {
        if(!members) {
            throw new Error("Missing required argument 'members'.");
        }
        return new EnumMapping(members);
    }

    export function createNumberMapping(): Mapping {
        return new NumberMapping();
    }

    export function createObjectMapping(): ObjectMapping {
        return new ObjectMappingImpl();
    }

    export function createRegExpMapping(): Mapping {
        return new RegExpMapping();
    }

    export function createStringMapping(): Mapping {
        return new StringMapping();
    }

    export function createTupleMapping(elementMappings: Mapping[]): Mapping {
        if(!elementMappings) {
            throw new Error("Missing required argument 'elementMappings'.");
        }
        return new TupleMapping(<InternalMapping[]>elementMappings);
    }
}

export = Mapping;