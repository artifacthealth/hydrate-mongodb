import {makeDecorator} from "reflect-helper";
import {Constructor, ParameterlessConstructor} from "../../core/constructor";

import {
    EntityAnnotation,
    EmbeddableAnnotation,
    ConverterAnnotation,
    CollectionAnnotation,
    IndexAnnotation,
    VersionFieldAnnotation,
    VersionedAnnotation,
    ChangeTrackingAnnotation,
    DiscriminatorFieldAnnotation,
    DiscriminatorValueAnnotation,
    CascadeAnnotation,
    InverseOfAnnotation,
    TypeAnnotation,
    ElementTypeAnnotation,
    MapKeyAnnotation,
    FieldAnnotation,
    EnumeratedAnnotation,
    IdAnnotation
} from "./annotations";

import {PropertyConverter} from "../mappingModel";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../mappingModel";
import {CascadeFlags} from "../mappingModel";

export declare function Entity(): ClassDecorator;

export declare function Embeddable(): ClassDecorator;

export declare function Converter(converter: string | PropertyConverter | ParameterlessConstructor<PropertyConverter>): ClassDecorator & PropertyDecorator;

export declare function Collection(name: string): ClassDecorator;
export declare function Collection(args?: { name?: string; db?: string, options?: CollectionOptions; }): ClassDecorator;

export declare function Id(): PropertyDecorator;

export declare function Index(args: { keys: [string, number][]; options?: IndexOptions;}): ClassDecorator;
export declare function Index(args?: { order?: number; options?: IndexOptions;}): PropertyDecorator;

export declare function VersionField(name: string): ClassDecorator;

export declare function Versioned(enabled?: boolean): ClassDecorator;

export declare function ChangeTracking(type: ChangeTrackingType): ClassDecorator;

export declare function DiscriminatorField(name: string): ClassDecorator;

export declare function DiscriminatorValue(value: string): ClassDecorator;

export declare function Field(name?: string): PropertyDecorator;
export declare function Field(args: { name?: string, nullable?: boolean }): PropertyDecorator;

export declare function Enumerated(members: Object): PropertyDecorator;

export declare function InverseOf(propertyName: string): PropertyDecorator;

export declare function  Cascade(flags: CascadeFlags): PropertyDecorator;

export declare function Type(target: Constructor<any> | string): PropertyDecorator;

export declare function ElementType(target: Constructor<any> | string): PropertyDecorator;

/**
 * @hidden
 */
export declare function MapKey(propertyName: string): PropertyDecorator;

exports.Entity = makeDecorator(EntityAnnotation);
exports.Embeddable = makeDecorator(EmbeddableAnnotation);
exports.Converter = makeDecorator(ConverterAnnotation);
exports.Collection = makeDecorator(CollectionAnnotation);
exports.Index = makeDecorator(IndexAnnotation);
exports.VersionField = makeDecorator(VersionFieldAnnotation);
exports.Versioned = makeDecorator(VersionedAnnotation);
exports.ChangeTracking = makeDecorator(ChangeTrackingAnnotation);
exports.DiscriminatorField = makeDecorator(DiscriminatorFieldAnnotation);
exports.DiscriminatorValue = makeDecorator(DiscriminatorValueAnnotation);
exports.Field = makeDecorator(FieldAnnotation);
exports.Enumerated = makeDecorator(EnumeratedAnnotation);
exports.Cascade = makeDecorator(CascadeAnnotation);
exports.InverseOf = makeDecorator(InverseOfAnnotation);
exports.Type = makeDecorator(TypeAnnotation);
exports.ElementType = makeDecorator(ElementTypeAnnotation);
exports.MapKey = makeDecorator(MapKeyAnnotation);
exports.Id = makeDecorator(IdAnnotation);


