///<reference path="../../../typings/reflect-metadata.d.ts"/>

import "reflect-metadata";

import {Constructor, ParameterlessConstructor} from "../../core/constructor";
import * as ReflectUtil from "../../core/reflectUtil";

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
    TransientAnnotation,
    ReferenceAnnotation,
    ReferenceManyAnnotation,
    EmbedManyAnnotation,
    FieldAnnotation,
    EnumeratedAnnotation
} from "./annotations";

import {PropertyConverter} from "../propertyConverter";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../changeTrackingType";
import {CascadeFlags} from "../cascadeFlags";
import {Mapping} from "../mapping";

export interface EntityDecoratorFactory {
    (): ClassDecorator;
}

export interface EmbeddableDecoratorFactory {
    (): ClassDecorator;
}

export interface ConverterDecoratorFactory {
    (converter: string | PropertyConverter | ParameterlessConstructor<PropertyConverter>): ClassDecorator & PropertyDecorator;
}

export interface CollectionDecoratorFactory {
    (name: string): ClassDecorator;
    (args?: { name?: string; db?: string, options?: CollectionOptions; }): ClassDecorator;
}

export interface IndexDecoratorFactory {
    (args: { keys: [string, number][]; options?: IndexOptions;}): ClassDecorator;
    (args?: { order?: number; options?: IndexOptions;}): PropertyDecorator;
}

export interface VersionFieldDecoratorFactory {
    (name: string): ClassDecorator;

}

export interface VersionedDecoratorFactory {
    (enabled?: boolean): ClassDecorator;
}

export interface ChangeTrackingDecoratorFactory {
    (type: ChangeTrackingType): ClassDecorator;

}

export interface DiscriminatorFieldDecoratorFactory {
    (name: string): ClassDecorator;
}

export interface DiscriminatorValueDecoratorFactory {
    (value: string): ClassDecorator;
}

export interface TransientDecoratorFactory {
    (): PropertyDecorator;
}

export interface ReferenceDecoratorFactory {
    (args?: { inverseOf?: string, cascade?: CascadeFlags }): PropertyDecorator;
}

export interface ReferenceManyDecoratorFactory {
    (type: Constructor<any>): PropertyDecorator;
    (args: { target: Constructor<any>, inverseOf?: string, cascade?: CascadeFlags }): PropertyDecorator;
}

export interface EmbedManyDecoratorFactory {
    (type: Constructor<any>): PropertyDecorator;
}

export interface FieldDecoratorFactory {
    (args?: { name?: string, nullable?: boolean }): PropertyDecorator;
}

export interface EnumeratedDecoratorFactory {
    (members: Object): PropertyDecorator;
}

export var Entity = <EntityDecoratorFactory>makeDecorator(EntityAnnotation);
export var Embeddable = <EmbeddableDecoratorFactory>makeDecorator(EmbeddableAnnotation);
export var Converter = <ConverterDecoratorFactory>makeDecorator(ConverterAnnotation);
export var Collection = <CollectionDecoratorFactory>makeDecorator(CollectionAnnotation);
export var Index = <IndexDecoratorFactory>makeDecorator(IndexAnnotation);
export var VersionField = <VersionFieldDecoratorFactory>makeDecorator(VersionFieldAnnotation);
export var Versioned = <VersionedDecoratorFactory>makeDecorator(VersionedAnnotation);
export var ChangeTracking = <ChangeTrackingDecoratorFactory>makeDecorator(ChangeTrackingAnnotation);
export var DiscriminatorField = <DiscriminatorFieldDecoratorFactory>makeDecorator(DiscriminatorFieldAnnotation);
export var DiscriminatorValue = <DiscriminatorValueDecoratorFactory>makeDecorator(DiscriminatorValueAnnotation);
export var Transient = <TransientDecoratorFactory>makeDecorator(TransientAnnotation);
export var Reference = <ReferenceDecoratorFactory>makeDecorator(ReferenceAnnotation);
export var ReferenceMany = <ReferenceManyDecoratorFactory>makeDecorator(ReferenceManyAnnotation);
export var EmbedMany = <EmbedManyDecoratorFactory>makeDecorator(EmbedManyAnnotation);
export var Field = <FieldDecoratorFactory>makeDecorator(FieldAnnotation);
//export var Collection = <CollectionDecoratorFactory>makeDecorator(CollectionAnnotation);
export var Enumerated = <EnumeratedDecoratorFactory>makeDecorator(EnumeratedAnnotation);

function makeDecorator(annotationCtr: Constructor<any>) {

    return function DecoratorFactory(...args: any[]) {

        var annotationInstance = Object.create(annotationCtr.prototype);
        annotationCtr.apply(annotationInstance, args);

        return function Decorator(target: Object, propertyName?: string): void {

            if(propertyName) {
                ReflectUtil.addAnnotation(annotationInstance, target.constructor, propertyName);
            }
            else {
                ReflectUtil.addAnnotation(annotationInstance, target, propertyName);
            }
        }
    }
}

