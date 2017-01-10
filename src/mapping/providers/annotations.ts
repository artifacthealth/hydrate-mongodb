import {PropertyConverter, FlushPriority, FetchType} from "../mappingModel";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../mappingModel";
import {CascadeFlags} from "../mappingModel";
import {Constructor, ParameterlessConstructor} from "../../index";
import {MappingModel} from "../mappingModel";
import {MappingBuilderContext} from "./mappingBuilderContext";
import {MappingBuilder} from "./mappingBuilder";
import {Type, Property, Method} from "reflect-helper";
import {EntityMappingBuilder} from "./entityMappingBuilder";
import {ClassMappingBuilder} from "./classMappingBuilder";
import {Index} from "../index";

/**
 * Indicates the order in which annotations are processed. Annotations with a higher priority are processed first.
 * @hidden
 */
export enum AnnotationPriority {

    High = 100,
    Medium = 50,
    Low = 0
}

/**
 * @hidden
 */
export class Annotation {

}

/**
 * @hidden
 */
export interface ClassAnnotation {

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, annotation: Annotation): void;
}

/**
 * @hidden
 */
export interface PropertyAnnotation {

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, property: MappingModel.Property, symbol: Property, annotation: Annotation): void;
}

/**
 * @hidden
 */
export interface MethodAnnotation {

    processMethodAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, method: Method, annotation: Annotation): void;
}

/**
 * @hidden
 */
export interface MappingBuilderAnnotation {

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder;
}

/**
 * @hidden
 */
export interface TargetClassAnnotation {

    target: Constructor<any> | string;
}

/**
 * @hidden
 */
export class EntityAnnotation extends Annotation implements MappingBuilderAnnotation {

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder {

        var parentMapping = <MappingModel.EntityMapping>getParentMapping(context, type);
        if(parentMapping && (parentMapping.flags & MappingModel.MappingFlags.Entity) == 0) {
            context.addError("Parent of mapping for '" + type.name + "' must be an entity mapping.");
            return;
        }

        return new EntityMappingBuilder(context, type, MappingModel.createEntityMapping((parentMapping)));
    }

    toString(): string {
        return "@Entity";
    }
}

/**
 * @hidden
 */
export class EmbeddableAnnotation extends Annotation implements MappingBuilderAnnotation {

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder {

        var parentMapping = getParentMapping(context, type);
        if(parentMapping && (parentMapping.flags & MappingModel.MappingFlags.Embeddable) == 0) {
            context.addError("Parent of mapping for '" + type.name + "' must be an embeddable mapping.");
            return;
        }

        return new ClassMappingBuilder(context, type, MappingModel.createClassMapping(parentMapping));
    }

    toString(): string {
        return "@Embeddable";
    }
}

/**
 * @hidden
 */
export class ConverterAnnotation extends Annotation implements MappingBuilderAnnotation {

    converter: PropertyConverter;
    converterCtr: ParameterlessConstructor<PropertyConverter>;
    converterName: string;

    /**
     * Constructs a ConverterAnnotation object.
     * @param converter The name, instance, or constructor of the PropertyConverter to apply to the property or class.
     */
    constructor(converter: string | PropertyConverter | ParameterlessConstructor<PropertyConverter>) {
        super();

        if(typeof converter === "string") {
            this.converterName = converter;
        }
        else if(typeof converter === "function") {
            this.converterCtr = <ParameterlessConstructor<PropertyConverter>>converter;
        }
        else {
            this.converter = <PropertyConverter>converter;
        }
    }

    toString(): string {
        return "@Converter";
    }

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder {

        return new MappingBuilder(context, type, this.createMapping(context));
    }

    createMapping(context: MappingBuilderContext): MappingModel.Mapping {

        if(this.converter) {
            return MappingModel.createConverterMapping(this.converter);
        }

        if(this.converterCtr) {
            return MappingModel.createConverterMapping(new this.converterCtr());
        }

        if(!this.converterName) {
            context.addError("A convert instance, constructor, or name must be specified.");
            return;
        }

        var converter = context.config.propertyConverters && context.config.propertyConverters[this.converterName];
        if(!converter) {
            context.addError("Unknown converter '" + this.converterName + "'. Make sure to add your converter to propertyConverters in the configuration.");
            return;
        }

        return MappingModel.createConverterMapping(converter);
    }
}

/**
 * @hidden
 */
export class CollectionAnnotation extends Annotation implements ClassAnnotation {

    /**
     * The name of the collection to use.
     */
    name: string;

    /**
     * The order in which collections are flushed to the database. Higher priority collections are flushed first.
     */
    flushPriority: FlushPriority;

    /**
     * The name of the database to use.
     */
    db: string;

    /**
     * Collection options to pass to driver.
     */
    options: CollectionOptions;

    constructor(name: string);
    constructor(description?: CollectionDescription);
    constructor(nameOrDescription?: string | CollectionDescription) {
        super();

        if(typeof nameOrDescription === "string") {
            this.name = nameOrDescription;
        }

        if(typeof nameOrDescription === "object") {
            this.name = nameOrDescription.name;
            this.flushPriority = nameOrDescription.flushPriority;
            this.db = nameOrDescription.db;
            this.options = nameOrDescription.options;
        }
    }

    toString(): string {
        return "@Collection";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, annotation: CollectionAnnotation): void {

        if(context.assertRootEntityMapping(mapping)) {

            if (annotation.name) {
                mapping.collectionName = annotation.name;
            }

            mapping.collectionOptions = annotation.options;
            // TODO: validate options

            if (annotation.db) {
                mapping.databaseName = annotation.db;
            }

            if (annotation.flushPriority != null) {
                mapping.flushPriority = annotation.flushPriority;
            }
        }
    }
}

export interface CollectionDescription {

    flushPriority?: FlushPriority;
    name?: string;
    db?: string,
    options?: CollectionOptions;
}

/**
 * @hidden
 */
export class IndexAnnotation extends Annotation implements ClassAnnotation, PropertyAnnotation {

    /**
     * The index keys as an array of tuples [name, 1|-1] if the annotation is specified on a class.
     */
    keys: [string, number | string][];

    /**
     * The order of the index if annotation is specified on a property.
     */
    order: number;

    /**
     * Index options to pass to the driver.
     */
    options: IndexOptions;

    constructor(args: ClassIndexDescription);
    constructor(args?: PropertyIndexDescription);
    constructor(args?: { keys?: [string, number | string][]; order?: number, options?: IndexOptions }) {
        super();

        if(args) {
            this.keys = args.keys;
            this.order = args.order;
            this.options = args.options;
        }
    }

    toString(): string {
        return "@Index";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, annotation: IndexAnnotation): void {

        this._addIndex(context, mapping, annotation);
    }

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, property: MappingModel.Property, symbol: Property, annotation: IndexAnnotation): void {

        this._addIndex(context, mapping, {
            keys: [[property.name, annotation.order || 1]],
            options: annotation.options
        });
    }

    private _addIndex(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, value: Index): void {

        // TODO: allow indexes in embedded types and map to containing root type
        if(context.assertEntityMapping(mapping)) {

            if (!Array.isArray(value.keys) || value.keys.length == 0) {
                context.addError("Missing or invalid property 'keys'.");
                return;
            }

            for (let i = 0; i < value.keys.length; i++) {

                let key = value.keys[i];
                if (!Array.isArray(key) || key.length != 2 || typeof key[0] !== "string") {
                    context.addError(`Index key ${i} is invalid. Key must be a tuple [path, order].`);
                    return;
                }

                let order = value.keys[i][1];
                if (order != 1 && order != -1 && order != 'text') {
                    context.addError("Valid values for index order are 1, -1, or 'text'.");
                    return;
                }
            }

            // TODO: validate index options
            mapping.addIndex(value);
        }
    }
}

export interface ClassIndexDescription {

    keys: [string, number | string][];
    options?: IndexOptions
}

export interface PropertyIndexDescription {

    order?: number | string;
    options?: IndexOptions
}


/**
 * @hidden
 */
export class VersionFieldAnnotation extends Annotation implements ClassAnnotation {

    /**
     * Constructs a VersionFieldAnnotation object.
     * @param name The name of the document field to use for versioning.
     */
    constructor(public name: string) {
        super();

    }

    toString(): string {
        return "@VersionField";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, annotation: VersionFieldAnnotation): void {

        if(context.assertRootEntityMapping(mapping)) {

            mapping.versionField = annotation.name;
            mapping.versioned = true;
        }
    }
}

/**
 * @hidden
 */
export class VersionedAnnotation extends Annotation implements ClassAnnotation {

    /**
     * Constructs a VersionedAnnotation object.
     * @param enabled Indicates if versioning is enabled. Default is true.
     */
    constructor(public enabled: boolean = true) {
        super();

    }

    toString(): string {
        return "@Versioned";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, annotation: VersionedAnnotation): void {

        if(context.assertRootEntityMapping(mapping)) {

            mapping.versioned = annotation.enabled;
        }
    }
}

/**
 * @hidden
 */
export class ChangeTrackingAnnotation extends Annotation implements ClassAnnotation {

    constructor(public type: ChangeTrackingType) {
        super();

    }

    toString(): string {
        return "@ChangeTracking";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.EntityMapping, annotation: ChangeTrackingAnnotation): void {

        if(context.assertRootEntityMapping(mapping)) {
            if((mapping.flags & MappingModel.MappingFlags.Immutable) != 0) {
                context.addError("Change tracking cannot be set on immutable entity.");
                return;
            }

            mapping.changeTracking = annotation.type;
        }
    }
}

/**
 * @hidden
 */
export class DiscriminatorFieldAnnotation extends Annotation implements ClassAnnotation {

    constructor(public name: string) {
        super();

    }

    toString(): string {
        return "@DiscriminatorField";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.ClassMapping, annotation: DiscriminatorFieldAnnotation): void {

        if(context.assertRootClassMapping(mapping)) {
            if(!annotation.name) {
                context.addError("Missing discriminator field name.");
                return;
            }
            mapping.discriminatorField = annotation.name;
        }
    }
}

/**
 * @hidden
 */
export class ImmutableAnnotation extends Annotation implements ClassAnnotation {

    toString(): string {
        return "@Immutable";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.ClassMapping, annotation: ImmutableAnnotation): void {

        if(context.assertClassMapping(mapping)) {

            mapping.flags |= MappingModel.MappingFlags.Immutable;

            // if this is a root entity then set the change tracking to 'None'
            if((mapping.flags & MappingModel.MappingFlags.Entity) != 0
                && (mapping.flags & MappingModel.MappingFlags.InheritanceRoot) != 0) {

                var entityMapping = (<MappingModel.EntityMapping>mapping);
                if (entityMapping.changeTracking != null) {
                    context.addError("Change tracking cannot be set on immutable entity.");
                    return;
                }

                entityMapping.changeTracking = ChangeTrackingType.None;
                // no reason to version an entity that isn't going to change.
                entityMapping.versioned = false;
            }
        }
    }
}

/**
 * @hidden
 */
export class DiscriminatorValueAnnotation extends Annotation  implements ClassAnnotation {

    constructor(public value: string) {
        super();

    }

    toString(): string {
        return "@DiscriminatorValue";
    }

    processClassAnnotation(context: MappingBuilderContext, mapping: MappingModel.ClassMapping, annotation: DiscriminatorValueAnnotation): void {

        if(context.assertClassMapping(mapping)) {
            if(!annotation.value) {
                context.addError("Missing discriminator value.");
                return;
            }

            try {
                mapping.setDiscriminatorValue(annotation.value);
            }
            catch(err) {
                context.addError(err.message);
            }
        }
    }
}

/**
 * @hidden
 */
export class InverseOfAnnotation extends Annotation implements PropertyAnnotation {

    constructor(public propertyName: string) {
        super();

    }

    toString(): string {
        return "@InverseOf";
    }

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, property: MappingModel.Property, symbol: Property, annotation: InverseOfAnnotation): void {

        // TODO: validate inverse relationship
        property.inverseOf = annotation.propertyName;
        property.setFlags(MappingModel.PropertyFlags.InverseSide);
    }
}

/**
 * @hidden
 */
export class CascadeAnnotation extends Annotation implements PropertyAnnotation {

    constructor(public flags: CascadeFlags) {
        super();

    }

    toString(): string {
        return "@Cascade";
    }

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, property: MappingModel.Property, symbol: Property, annotation: CascadeAnnotation): void {

        property.setFlags(annotation.flags & MappingModel.PropertyFlags.CascadeAll);
    }
}

/**
 * @hidden
 */
export class FetchAnnotation extends Annotation implements PropertyAnnotation {

    constructor(public type: FetchType) {
        super();

    }

    toString(): string {
        return "@Fetch";
    }

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, property: MappingModel.Property, symbol: Property, annotation: FetchAnnotation): void {

        property.setFlags(annotation.type & (MappingModel.PropertyFlags.FetchEager | MappingModel.PropertyFlags.FetchLazy));
    }
}

/**
 * @hidden
 */
export class TypeAnnotation extends Annotation implements TargetClassAnnotation {

    constructor(public target: Constructor<any> | string) {
        super();

    }

    toString(): string {
        return "@Type";
    }
}

/**
 * @hidden
 */
export class ElementTypeAnnotation extends Annotation implements TargetClassAnnotation {

    constructor(public target: Constructor<any> | string) {
        super();

    }

    toString(): string {
        return "@ElementType";
    }
}

/**
 * @hidden
 */
export class MapKeyAnnotation extends Annotation {

    constructor(public propertyName: string) {
        super();

    }

    toString(): string {
        return "@MapKey";
    }
}

/**
 * @hidden
 */
export class FieldAnnotation extends Annotation implements PropertyAnnotation {

    name: string;
    nullable: boolean;
    readable: boolean;

    constructor(name?: string);
    constructor(args: FieldDescription);
    constructor(args?: any) {
        super();

        if(args) {
            if(typeof args === "string") {
                this.name = args;
            }
            else {
                this.name = args.name;
                this.nullable = args.nullable;
                this.readable = args.readable;
            }
        }
    }

    toString(): string {
        return "@Field";
    }

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, property: MappingModel.Property,
                              symbol: Property, annotation: FieldAnnotation): void {

        if (annotation.name) {
            property.field = annotation.name;
        }

        if (annotation.nullable) {
            property.setFlags(MappingModel.PropertyFlags.Nullable);
        }

        if (annotation.readable === false) {
            property.setFlags(MappingModel.PropertyFlags.WriteOnly);
        }
    }
}

export interface FieldDescription {

    /**
     * The name of the database document field.
     */
    name?: string;

    /**
     * Indicates if null values are supported. If false then null values are not written to the database. Default is false.
     */
    nullable?: boolean;

    /**
     * Indicates if the database document field should be read. Default is true. If set the `false` the database document field may still
     * be written to but the field value is not read when deserializing the document from the database. This is useful if your entity has
     * an accessor with a value calculated from other fields in the class that you want to store to the database for queries.
     */
    readable?: boolean;
}

/**
 * @hidden
 */
export class EnumeratedAnnotation {

    constructor(public members: Object) {

    }

    toString(): string {
        return "@Enumerated";
    }
}

/**
 * @hidden
 */
function getParentMapping(context: MappingBuilderContext, type: Type): MappingModel.ClassMapping {

    var baseType = type.baseType;
    if(baseType) {
        var builder = context.getBuilder(baseType);
        if(builder) {
            return <MappingModel.ClassMapping>builder.mapping;
        }
    }
}

/**
 * @hidden
 */
export class TransientAnnotation implements PropertyAnnotation {

    toString(): string {
        return "@Transient";
    }

    processPropertyAnnotation(context: MappingBuilderContext, mapping: MappingModel.ObjectMapping, property: MappingModel.Property, symbol: Property, annotation: Annotation): void {

        property.field = null;
        property.setFlags(MappingModel.PropertyFlags.Ignored);
    }
}
