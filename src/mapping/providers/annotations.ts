import {PropertyConverter} from "../propertyConverter";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../changeTrackingType";
import {EnumType} from "../enumType";
import {CascadeFlags} from "../cascadeFlags";
import {Constructor, ParameterlessConstructor} from "../../core/constructor";
import {Mapping} from "../mapping";
import {MappingBuilderContext} from "./mappingBuilderContext";
import {MappingBuilder} from "./mappingBuilder";
import {Type} from "../../core/type";
import {MappingFlags} from "../mappingFlags";
import {EntityMappingBuilder} from "./entityMappingBuilder";
import {ClassMappingBuilder} from "./classMappingBuilder";

export interface MappingBuilderAnnotation {

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder;
}

export interface TargetClassAnnotation {

    target: Constructor<any> | string;
}

export class EntityAnnotation implements MappingBuilderAnnotation {

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder {

        var parentMapping = <Mapping.EntityMapping>getParentMapping(context, type);
        if(parentMapping && (parentMapping.flags & MappingFlags.Entity) == 0) {
            context.addError("Parent of mapping for '" + type.name + "' must be an entity mapping.");
            return;
        }

        return new EntityMappingBuilder(context, type, Mapping.createEntityMapping((parentMapping)));
    }

    toString(): string {
        return "@Entity";
    }
}

export class EmbeddableAnnotation implements MappingBuilderAnnotation {

    createBuilder(context: MappingBuilderContext, type: Type): MappingBuilder {

        var parentMapping = getParentMapping(context, type);
        if(parentMapping && (parentMapping.flags & MappingFlags.Embeddable) == 0) {
            context.addError("Parent of mapping for '" + type.name + "' must be an embeddable mapping.");
            return;
        }

        return new ClassMappingBuilder(context, type, Mapping.createClassMapping(parentMapping));
    }

    toString(): string {
        return "@Embeddable";
    }
}

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

    createMapping(context: MappingBuilderContext): Mapping {

        if(this.converter) {
            return Mapping.createConverterMapping(this.converter);
        }

        if(this.converterCtr) {
            return Mapping.createConverterMapping(new this.converterCtr());
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

        return Mapping.createConverterMapping(converter);
    }
}

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
    constructor(args?: { name?: string; db?: string, options?: CollectionOptions; });
    constructor(nameOrArgs?: string | { name?: string; db?: string, options?: CollectionOptions; }) {

        if(typeof nameOrArgs === "string") {
            this.name = nameOrArgs;
        }

        if(typeof nameOrArgs === "object") {
            this.name = nameOrArgs.name;
            this.db = nameOrArgs.db;
            this.options = nameOrArgs.options;
        }
    }

    toString(): string {
        return "@Collection";
    }
}

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

    constructor(args: { keys: [string, number][]; options?: IndexOptions; });
    constructor(args?: { order?: number; options?: IndexOptions; });
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

export class ChangeTrackingAnnotation {

    constructor(public type: ChangeTrackingType) {

    }
}

export class DiscriminatorFieldAnnotation {

    constructor(public name: string) {

    }

    toString(): string {
        return "@DiscriminatorField";
    }
}

export class DiscriminatorValueAnnotation {

    constructor(public value: string) {

    }

    toString(): string {
        return "@DiscriminatorValue";
    }
}

export class ReferencedAnnotation implements TargetClassAnnotation {

    target: Constructor<any> | string;
    inverseOf: string;
    cascade: CascadeFlags;

    constructor(target: Constructor<any> | string);
    constructor(args?: { target?: Constructor<any> | string, inverseOf?: string, cascade?: CascadeFlags });
    constructor(args?: any) {

        if(args) {
            if (typeof args === "function" || typeof args === "string") {
                this.target = args;
            }
            else {
                this.target = args.target;
                this.inverseOf = args.inverseOf;
                this.cascade = args.cascade;
            }
        }
    }
}

export class ReferenceOneAnnotation extends ReferencedAnnotation {

    toString(): string {
        return "@ReferenceOne";
    }
}

export class ReferenceManyAnnotation extends ReferencedAnnotation {

    toString(): string {
        return "@ReferenceMany";
    }
}

export class EmbeddedAnnotation implements TargetClassAnnotation {

    constructor(public target: Constructor<any> | string) {

    }
}

export class EmbedOneAnnotation extends EmbeddedAnnotation {

    toString(): string {
        return "@EmbedOne";
    }
}

export class EmbedManyAnnotation extends EmbeddedAnnotation {

    toString(): string {
        return "@EmbedMany";
    }
}

export class FieldAnnotation {

    name: string;
    nullable: boolean;

    constructor(args?: { name?: string, nullable?: boolean }) {

        if(args) {
            this.name = args.name;
            this.nullable = args.nullable;
        }
    }

    toString(): string {
        return "@Field";
    }
}

export class EnumeratedAnnotation {

    constructor(public members: Object) {

    }

    toString(): string {
        return "@Enumerated";
    }
}

function getParentMapping(context: MappingBuilderContext, type: Type): Mapping.ClassMapping {

    var baseType = type.baseType;
    if(baseType) {
        var builder = context.getBuilder(baseType);
        if(builder) {
            return <Mapping.ClassMapping>builder.mapping;
        }
    }
}