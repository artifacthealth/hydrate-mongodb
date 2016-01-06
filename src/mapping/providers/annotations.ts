import {PropertyConverter} from "../propertyConverter";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../changeTrackingType";
import {EnumType} from "../enumType";
import {CascadeFlags} from "../cascadeFlags";
import {Constructor, ParameterlessConstructor} from "../../core/constructor";
import {Mapping} from "../mapping";
import {MappedTypeContext} from "./mappedTypeContext";
import {MappedType} from "./mappedType";
import {Type} from "../../core/type";
import {MappingFlags} from "../mappingFlags";
import {EntityMappedType} from "./entityMappedType";
import {ClassMappedType} from "./classMappedType";

export interface MappedTypeAnnotation {

    createMappedType(context: MappedTypeContext, type: Type): MappedType;
}

export interface TargetClassAnnotation {

    target: Constructor<any> | string;
}

export class EntityAnnotation implements MappedTypeAnnotation {

    createMappedType(context: MappedTypeContext, type: Type): MappedType {

        var parentMapping = <Mapping.EntityMapping>getParentMapping(context, type);
        if(parentMapping && (parentMapping.flags & MappingFlags.Entity) == 0) {
            context.addError("Parent of mapping for '" + type.name + "' must be an entity mapping.");
            return;
        }

        return new EntityMappedType(context, type, Mapping.createEntityMapping((parentMapping)));
    }
}

export class EmbeddableAnnotation implements MappedTypeAnnotation {

    createMappedType(context: MappedTypeContext, type: Type): MappedType {

        var parentMapping = getParentMapping(context, type);
        if(parentMapping && (parentMapping.flags & MappingFlags.Embeddable) == 0) {
            context.addError("Parent of mapping for '" + type.name + "' must be an embeddable mapping.");
            return;
        }

        return new ClassMappedType(context, type, Mapping.createClassMapping(parentMapping));
    }
}

export class ConverterAnnotation implements MappedTypeAnnotation {

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

    createMappedType(context: MappedTypeContext, type: Type): MappedType {

        return new MappedType(context, type, this.createConverterMapping(context));
    }

    createConverterMapping(context: MappedTypeContext): Mapping {

        if(this.converter) {
            return Mapping.createConverterMapping(this.converter);
        }

        if(this.converterCtr) {
            return Mapping.createConverterMapping(new this.converterCtr());
        }

        if(!this.converterName) {
            throw new Error("Invalid annotation @Converter. A convert instance, constructor, or name must be specified.");
        }

        var converter = context.config.propertyConverters && context.config.propertyConverters[this.converterName];
        if(!converter) {
            throw new Error("Invalid annotation @Converter. Unknown converter '" + this.converterName + "'. Make sure to add your converter to propertyConverters in the configuration.");
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
}

export class VersionFieldAnnotation {

    /**
     * Constructs a VersionFieldAnnotation object.
     * @param name The name of the document field to use for versioning.
     */
    constructor(public name: string) {

    }
}

export class VersionedAnnotation {

    /**
     * Constructs a VersionedAnnotation object.
     * @param enabled Indicates if versioning is enabled. Default is true.
     */
    constructor(public enabled: boolean = true) {

    }
}

export class ChangeTrackingAnnotation {

    constructor(public type: ChangeTrackingType) {

    }
}

export class DiscriminatorFieldAnnotation {

    constructor(public name: string) {

    }
}

export class DiscriminatorValueAnnotation {

    constructor(public value: string) {

    }
}

export class TransientAnnotation {

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

}

export class ReferenceManyAnnotation extends ReferencedAnnotation {

}

export class EmbeddedAnnotation implements TargetClassAnnotation {

    constructor(public target: Constructor<any> | string) {

    }
}

export class EmbedOneAnnotation extends EmbeddedAnnotation {

}

export class EmbedManyAnnotation extends EmbeddedAnnotation {

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
}

export class EnumeratedAnnotation {

    constructor(public members: Object) {

    }
}

function getParentMapping(context: MappedTypeContext, type: Type): Mapping.ClassMapping {

    var baseType = type.baseType;
    if(baseType) {
        var mappedType = context.getMappedType(baseType);
        if(mappedType) {
            return <Mapping.ClassMapping>mappedType.mapping;
        }
    }
}