import {ArrayMapping} from "./arrayMapping";
import {BooleanMapping} from "./booleanMapping";
import {ClassMapping as ClassMappingImpl} from "./classMapping";
import {DateMapping} from "./dateMapping";
import {EntityMapping as EntityMappingImpl} from "./entityMapping";
import {EnumMapping as EnumMappingImpl} from "./enumMapping";
import {NumberMapping} from "./numberMapping";
import {ObjectMapping as ObjectMappingImpl} from "./objectMapping";
import {RegExpMapping} from "./regExpMapping";
import {StringMapping} from "./stringMapping";
import {TupleMapping} from "./tupleMapping";
import {MappingFlags} from "./mappingFlags";
import {InternalMapping} from "./internalMapping";
import {PropertyFlags} from "./propertyFlags";
import {Property as PropertyImpl} from "./property";
import {Index} from "./index";
import {IndexOptions} from "./indexOptions";
import {CollectionOptions} from "./collectionOptions";
import {ChangeTrackingType} from "./changeTrackingType";
import {IdentityGenerator} from "../id/identityGenerator";
import {EnumType} from "./enumType";
import {PropertyConverter} from "./propertyConverter";
import {ConverterMapping} from "./converterMapping";
import {BufferMapping} from "./bufferMapping";

export interface Mapping {
    id: number;
    flags: MappingFlags;
}

export namespace Mapping {

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

        /**
         * Sets the property flags.
         */
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

    export interface EnumMapping extends Mapping {

        ignoreCase: boolean;
        type: EnumType;
    }

    export interface EntityMapping extends ClassMapping {

        collectionName: string;
        databaseName: string;
        indexes: Index[];
        collectionOptions: CollectionOptions;

        identity: IdentityGenerator;

        changeTracking: ChangeTrackingType;

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

    export function createEnumMapping(members: EnumMembers): EnumMapping {
        if(!members) {
            throw new Error("Missing required argument 'members'.");
        }
        return new EnumMappingImpl(members);
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

    export function createConverterMapping(converter: PropertyConverter): Mapping {
        return new ConverterMapping(converter);
    }

    export function createBufferMapping(): Mapping {
        return new BufferMapping();
    }

    export function createTupleMapping(elementMappings: Mapping[]): Mapping {
        if(!elementMappings) {
            throw new Error("Missing required argument 'elementMappings'.");
        }
        return new TupleMapping(<InternalMapping[]>elementMappings);
    }
}
