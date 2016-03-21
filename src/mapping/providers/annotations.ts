import {PropertyConverter} from "../mappingModel";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../mappingModel";
import {EnumType} from "../enumType";
import {CascadeFlags} from "../mappingModel";
import {Constructor, ParameterlessConstructor} from "../../index";
import {MappingModel} from "../mappingModel";
import {MappingBuilderContext} from "./mappingBuilderContext";
import {MappingBuilder} from "./mappingBuilder";
import {Type} from "reflect-helper";
import {EntityMappingBuilder} from "./entityMappingBuilder";
import {ClassMappingBuilder} from "./classMappingBuilder";

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
export class IdAnnotation {

    toString(): string {
        return "@Id";
    }
}

/**
 * @hidden
 */
export class EntityAnnotation implements MappingBuilderAnnotation {

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
export class EmbeddableAnnotation implements MappingBuilderAnnotation {

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
export class ConverterAnnotation implements MappingBuilderAnnotation {

    converter: PropertyConverter;
    converterCtr: ParameterlessConstructor<PropertyConverter>;
    converterName: string;

    /**
     * Constructs a ConverterAnnotation object.
     * @param converter The name, instance, or constructor of the PropertyConverter to apply to the property or class.
     */
    constructor(converter: string | PropertyConverter | ParameterlessConstructor<PropertyConverter>) {

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
export class CollectionAnnotation {

    /**
     * The name of the collection to use.
     */
    name: string;

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

        if(typeof nameOrDescription === "string") {
            this.name = nameOrDescription;
        }

        if(typeof nameOrDescription === "object") {
            this.name = nameOrDescription.name;
            this.db = nameOrDescription.db;
            this.options = nameOrDescription.options;
        }
    }

    toString(): string {
        return "@Collection";
    }
}

export interface CollectionDescription {

    name?: string;
    db?: string,
    options?: CollectionOptions;
}

/**
 * @hidden
 */
export class IndexAnnotation {

    /**
     * The index keys as an array of tuples [name, 1|-1] if the annotation is specified on a class.
     */
    keys: [string, number][];

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
    constructor(args?: { keys?: [string, number][]; order?: number, options?: IndexOptions }) {

        if(args) {
            this.keys = args.keys;
            this.order = args.order;
            this.options = args.options;
        }
    }

    toString(): string {
        return "@Index";
    }
}

export interface ClassIndexDescription {

    keys: [string, number][];
    options?: IndexOptions
}

export interface PropertyIndexDescription {

    order?: number;
    options?: IndexOptions
}


/**
 * @hidden
 */
export class VersionFieldAnnotation {

    /**
     * Constructs a VersionFieldAnnotation object.
     * @param name The name of the document field to use for versioning.
     */
    constructor(public name: string) {

    }

    toString(): string {
        return "@VersionField";
    }
}

/**
 * @hidden
 */
export class VersionedAnnotation {

    /**
     * Constructs a VersionedAnnotation object.
     * @param enabled Indicates if versioning is enabled. Default is true.
     */
    constructor(public enabled: boolean = true) {

    }

    toString(): string {
        return "@Versioned";
    }
}

/**
 * @hidden
 */
export class ChangeTrackingAnnotation {

    constructor(public type: ChangeTrackingType) {

    }
}

/**
 * @hidden
 */
export class DiscriminatorFieldAnnotation {

    constructor(public name: string) {

    }

    toString(): string {
        return "@DiscriminatorField";
    }
}

/**
 * @hidden
 */
export class DiscriminatorValueAnnotation {

    constructor(public value: string) {

    }

    toString(): string {
        return "@DiscriminatorValue";
    }
}

/**
 * @hidden
 */
export class InverseOfAnnotation {

    constructor(public propertyName: string) {

    }

    toString(): string {
        return "@InverseOf";
    }
}

/**
 * @hidden
 */
export class CascadeAnnotation {

    constructor(public flags: CascadeFlags) {

    }

    toString(): string {
        return "@Cascade";
    }
}

/**
 * @hidden
 */
export class TypeAnnotation implements TargetClassAnnotation {

    constructor(public target: Constructor<any> | string) {

    }

    toString(): string {
        return "@Type";
    }
}

/**
 * @hidden
 */
export class ElementTypeAnnotation implements TargetClassAnnotation{

    constructor(public target: Constructor<any> | string) {

    }

    toString(): string {
        return "@ElementType";
    }
}

/**
 * @hidden
 */
export class MapKeyAnnotation {

    constructor(public propertyName: string) {

    }

    toString(): string {
        return "@MapKey";
    }
}

/**
 * @hidden
 */
export class FieldAnnotation {

    name: string;
    nullable: boolean;

    constructor(name?: string);
    constructor(args: FieldDescription);
    constructor(args?: any) {

        if(args) {
            if(typeof args === "string") {
                this.name = args;
            }
            else {
                this.name = args.name;
                this.nullable = args.nullable;
            }
        }
    }

    toString(): string {
        return "@Field";
    }
}

export interface FieldDescription {

    name?: string;
    nullable?: boolean;
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