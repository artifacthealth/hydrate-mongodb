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
import {InternalMapping} from "./internalMapping";
import {Property as PropertyImpl} from "./property";
import {Index} from "./index";
import {CollectionOptions} from "./collectionOptions";
import {IdentityGenerator} from "../config/configuration";
import {ConverterMapping} from "./converterMapping";
import {BufferMapping} from "./bufferMapping";
import {PersistenceError} from "../persistenceError";


export namespace MappingModel {

    /**
     * Represents a data mapping.
     */
    export interface Mapping {
        /**
         * Readonly flags that describe the mapping. This value is assigned internally and should not be modified.
         */
        flags: MappingFlags;

        /**
         * Returns true if the mapping has the specified flags; otherwise, returns false.
         */
        hasFlags(flags: MappingFlags): boolean;
    }

    /**
     * Map of enumeration members where the key is the name and the value is the numeric value of the enum member.
     */
    export interface EnumMembers {

        [name: string]: number;
    }

    /**
     * Represents a mapping a database document field to an object property.
     */
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
         * Indicates if null values should be saved for this property. By default a property is removed from the object
         * when saved if it has a value of `null` or `undefined`.
         */
        nullable?: boolean;

        /**
         * The name of the database document field.
         */
        field: string

        /**
         * Describes the inverse relationship.
         */
        inverse?: InverseRelationship;

        /**
         * The mapping of the property.
         */
        mapping: Mapping;

        /**
         * Sets the property flags.
         */
        setFlags(flags: PropertyFlags): void;
    }

    export interface InverseRelationship {

        /**
         * The name of the property in the target TypeMapping that is used to retrieve the value of this property.
         */
        propertyName: string;

        /**
         * Sorting to apply when fetching the inverse relationship.
         */
        sort?: [string, number][];

        /**
         * Limit to apply when retrieving the inverse relationship.
         */
        limit?: number;
    }

    /**
     * Flags that indicate the type of [[Mapping]].
     */
    export const enum MappingFlags {

        Array               = 0x00000001,
        Boolean             = 0x00000002,
        Class               = 0x00000004,
        Date                = 0x00000008,
        Enum                = 0x00000010,
        Number              = 0x00000020,
        Object              = 0x00000040,
        RegExp              = 0x00000080,
        String              = 0x00000100,
        Tuple               = 0x00000200,
        Entity              = 0x00000400,
        Embeddable          = 0x00000800,
        InheritanceRoot     = 0x00001000,
        Converter           = 0x00002000,
        Buffer              = 0x00004000,
        Iterable            = 0x00008000,
        Virtual             = 0x00010000,
        Immutable           = 0x00020000,

        ImmutableEmbeddable = Immutable | Embeddable
    }

    /**
     * Flags for a [[Property]] mapping.
     */
    export const enum PropertyFlags {

        /**
         * No flags.
         */
        None = 0,

        /**
         * Indicates that the property is ignored.
         */
        Ignored = 0x00000001,

        /**
         * Save operations should be cascaded to this property.
         */
        CascadeSave = 0x00000002,

        /**
         * Remove operations should be cascaded to this property.
         */
        CascadeRemove = 0x00000004,

        /**
         * Detach operations should be cascaded to this property.
         */
        CascadeDetach = 0x00000008,

        /**
         * Refresh operations should be cascaded to this property.
         */
        CascadeRefresh = 0x00000010,

        /**
         * Merge operations should be cascaded to this property.
         */
        CascadeMerge = 0x00000020,

        /**
         * All operations should be cascaded to this property.
         */
        CascadeAll = CascadeSave | CascadeRemove | CascadeDetach | CascadeRefresh | CascadeMerge,

        /**
         * All operations should be cascaded to this property.
         */
        InverseSide = 0x00000040,

        /**
         * Not currently supported.
         * @hidden
         */
        OrphanRemoval = 0x00000100,

        /**
         * Indicates the database field should not be read during deserialization.
         */
        WriteOnly = 0x00000200,

        /**
         * Indicates the field should be eagerly fetched.
         */
        FetchEager = 0x00000400,

        /**
         * Indicates the field should be lazily fetched.
         */
        FetchLazy = 0x00000800,

        /**
         * Property should contain a reference to the parent of the embeddable.
         */
        Parent = 0x00001000,

        /**
         * All non-walk flags.
         * @hidden
         */
        All = Ignored | CascadeAll | InverseSide | OrphanRemoval | WriteOnly | FetchEager | FetchLazy | Parent,

        /**
         * Indicates that references to entities should be walked.
         * @hidden
         */
        WalkEntities = 0x00002000,

        /**
         * Indicates that reference found during a walk operation should be fetched.
         * @hidden
         */
        Dereference = 0x00004000
    }

    /**
     * Represents the mappings from a document to an anonymous object type.
     */
    export interface ObjectMapping extends Mapping {

        addProperty(property: Property): void;
        getProperty(name: string): Property;
        /**
         * Validates a property before adding it to the mapping. Returns any validation error messages or undefined if none.
         * @param property The property to validate.
         * @returns The error message.
         */
        validateProperty(property: Property): string;
    }

    /**
     * Represents the mapping from a document to a named class type.
     */
    export interface ClassMapping extends ObjectMapping {

        /**
         * The name of the class.
         */
        name: string;

        /**
         * The database document field to use to represent the type of the class. If not specified, the field name from
         * the Configuration is used. Only valid on the root mapping of an inheritance hierarchy.
         */
        discriminatorField: string;

        /**
         * Readonly property gets the value used to represent the class type in the database document.
         */
        discriminatorValue: string;

        /**
         * The constructor for the class.
         */
        classConstructor: Function;

        /**
         * Readonly property indicates if this class mapping has derived classes.
         */
        hasSubClasses: boolean;

        /**
         * Readonly property indicates if this class mapping has a base class.
         */
        hasBaseClass: boolean;

        /**
         * Sets the value used to represent the class type in the database document. If not specified, the naming
         * strategy in the Configuration is used to determine the discriminator value based on the class name.
         * @param value The value to use for the discriminator for this class.
         */
        setDiscriminatorValue(value: string): void;
    }

    /**
     * Represents the mapping from a document collection to a named class type.
     */
    export interface EntityMapping extends ClassMapping {

        /**
         * The database collection name. If not specified, the naming strategy specified in the Configuration is used to
         * determine the collection name.
         */
        collectionName: string;

        /**
         * The name of the database. If not specified, the default database for the connection is used.
         */
        databaseName: string;

        /**
         * The order in which collections are flushed to the database. Higher priority collections are flushed first.
         */
        flushPriority: FlushPriority;

        /**
         * A list of indexes to optionally create for the collection on startup.
         */
        indexes: Index[];

        /**
         * Options to pass to the database when creating the collection.
         */
        collectionOptions: CollectionOptions;

        /**
         * The IdentityGenerator to use for this collection. If not specified, the IdentityGenerator specified in
         * the Configuration is used.
         */
        identity: IdentityGenerator;

        /**
         * The change tracking to use for this entity. If not specified, the change tracking type specified in the
         * Configuration is used.
         */
        changeTracking: ChangeTrackingType;

        /**
         * Indicates if this entity should use optimistic locking. Default is true.
         */
        versioned: boolean;

        /**
         * The name of the database document field to use to store the version of the entity. If not specified the
         * value from the Configuration is used.
         */
        versionField: string;

        /**
         * Adds a specification for an index that should be created on the collection. The index is only created if
         * creation of indexes is enabled.
         * @param index The index specification.
         */
        addIndex(index: Index): void;
    }

    /**
     * Creates a property for an object mapping.
     * @param name The name of the property on the object.
     * @param mapping The mapping for the property type.
     */
    export function createProperty(name: string, mapping: Mapping): Property {
        if(!name) {
            throw new PersistenceError("Missing required argument 'name'.");
        }
        if(!mapping) {
            throw new PersistenceError("Missing required argument 'mapping'.");
        }
        return new PropertyImpl(name, <InternalMapping>mapping);
    }

    /**
     * Create a mapping for an array.
     * @param elementMapping The mapping for the array element.
     */
    export function createArrayMapping(elementMapping: Mapping): Mapping {
        if(!elementMapping) {
            throw new PersistenceError("Missing required argument 'elementMapping'.");
        }
        return new ArrayMapping(<InternalMapping>elementMapping);
    }

    /**
     * Creates a mapping for a boolean.
     */
    export function createBooleanMapping(): Mapping {
        return new BooleanMapping();
    }

    /**
     * Creates a mapping for a named class type.
     * @param baseClass Optional. The mapping for the base class.
     */
    export function createClassMapping(baseClass?: ClassMapping): ClassMapping {
        return new ClassMappingImpl(<ClassMappingImpl>baseClass);
    }

    /**
     * Creates a mapping for a date.
     */
    export function createDateMapping(): Mapping {
        return new DateMapping();
    }

    /**
     * Creates a mapping for a named class type associated with a database collection.
     * @param baseClass Optional. The mapping for the base class.
     */
    export function createEntityMapping(baseClass?: EntityMapping): EntityMapping {
        return new EntityMappingImpl(<EntityMappingImpl>baseClass);
    }

    /**
     * Creates a mapping for an enumeration.
     * @param members The members to include in the enumeration mapping.
     */
    export function createEnumMapping(members: EnumMembers, ignoreCase?: boolean): Mapping {
        if(!members) {
            throw new PersistenceError("Missing required argument 'members'.");
        }
        return new EnumMappingImpl(members, ignoreCase);
    }

    /**
     * Creates a mapping for a number.
     */
    export function createNumberMapping(): Mapping {
        return new NumberMapping();
    }

    /**
     * Creates a mapping for an anonymous object.
     */
    export function createObjectMapping(): ObjectMapping {
        return new ObjectMappingImpl();
    }

    /**
     * Creates a mapping for a regular expression.
     */
    export function createRegExpMapping(): Mapping {
        return new RegExpMapping();
    }

    /**
     * Creates a mapping for a string.
     */
    export function createStringMapping(): Mapping {
        return new StringMapping();
    }

    /**
     * Creates a mapping for a property converter.
     * @param converter The PropertyConverter to use for the mapping.
     */
    export function createConverterMapping(converter: PropertyConverter): Mapping {
        return new ConverterMapping(converter);
    }

    /**
     * Creates a mapping for a binary buffer.
     */
    export function createBufferMapping(): Mapping {
        return new BufferMapping();
    }

    /**
     * Creates a mapping for a tuple.
     * @param elementMappings An array for mappings to use for the tuple elements.
     */
    export function createTupleMapping(elementMappings: Mapping[]): Mapping {
        if(!elementMappings) {
            throw new PersistenceError("Missing required argument 'elementMappings'.");
        }
        return new TupleMapping(<InternalMapping[]>elementMappings);
    }
}

export interface PropertyConverter {

    /**
     * Converts an object property value to a document field value.
     * @param property The property value to convert.
     */
    convertToDocumentField(property: any): any;

    /**
     * Converts a document field value to an object property value.
     * @param field The field value to convert.
     */
    convertToObjectProperty(field: any): any;

    /**
     * Returns true if the document field values are equal; otherwise, returns false. This method is only called if both values are not
     * null and the values are not strictly equal.
     * @param field1 First document field value.
     * @param field2 Other document field value.
     */
    areEqual(field1: any, field2: any): boolean;
}

export const enum ChangeTrackingType {

    None,
    DeferredImplicit,
    DeferredExplicit
}

/**
 * Indicates the order in which collections are flushed to the database. Higher priority collections are flushed first. By default
 * collections are given a priority of Medium.
 */
export const enum FlushPriority {

    High = 100,
    MediumHigh = 75,
    Medium = 50,
    MediumLow = 25,
    Low = 0
}

/**
 * Flags that indicate how operations should cascade to a property.
 */
export const enum CascadeFlags {

    /**
     * No flags.
     */
    None = 0,

    /**
     * Save operations should be cascaded to this property.
     */
    Save = MappingModel.PropertyFlags.CascadeSave,

    /**
     * Remove operations should be cascaded to this property.
     */
    Remove = MappingModel.PropertyFlags.CascadeRemove,

    /**
     * Detach operations should be cascaded to this property.
     */
    Detach = MappingModel.PropertyFlags.CascadeDetach,

    /**
     * Refresh operations should be cascaded to this property.
     */
    Refresh = MappingModel.PropertyFlags.CascadeRefresh,

    /**
     * Merge operations should be cascaded to this property.
     */
    Merge = MappingModel.PropertyFlags.CascadeMerge,

    /**
     * All operations should be cascaded to this property.
     */
    All = MappingModel.PropertyFlags.CascadeAll,
}

export const enum FetchType {

    /**
     * Indicates the field should be eagerly fetched.
     */
    Eager = MappingModel.PropertyFlags.FetchEager,

    /**
     * Indicates the field should be lazily fetched.
     */
    Lazy = MappingModel.PropertyFlags.FetchLazy
}
