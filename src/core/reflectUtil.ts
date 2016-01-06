///<reference path="../../typings/reflect-metadata.d.ts"/>

import "reflect-metadata";
import {Constructor} from "./constructor"
import {inherits} from "util";

export function getPropertyType(obj: Object, method: string): Object {

    return Reflect.getMetadata('design:type', obj, method);
}

export function getPropertyNames(target: Object): string[] {

    if(target) {
        var properties = Reflect.getOwnMetadata('hydrate:properties', target);
        if (properties) {
            return Object.getOwnPropertyNames(properties);
        }
    }

    return [];
}

export function getBaseType(obj: Constructor<any>): Constructor<any> {

    var basePrototype = obj && obj.prototype && Object.getPrototypeOf(obj.prototype);
    return basePrototype && basePrototype.constructor;
}

export function addAnnotation(value: any, target: Object, propertyName?: string): void {

    var annotations = getOwnMetadata(target, propertyName);
    annotations.push(value);
    defineMetadata(annotations, target, propertyName);
}

export function getClassAnnotations(target: Constructor<any>, inherit?: boolean): any[];
export function getClassAnnotations<T>(target: Constructor<any>, annotationCtr: Constructor<T>, inherit?: boolean) : T[];
export function getClassAnnotations(target: Constructor<any>, inheritOrAnnotationCtr?: any, inherit?: boolean): any[] {

    var annotationCtr: Constructor<any>;

    if(typeof inheritOrAnnotationCtr === "function") {
        annotationCtr = inheritOrAnnotationCtr;
    }
    else if(typeof inheritOrAnnotationCtr === "boolean") {
        inherit = inheritOrAnnotationCtr;
    }

    var annotations = matchingAnnotations(annotationCtr, getOwnMetadata(target));

    if(inherit) {
        var baseType = getBaseType(target);
        if(baseType) {
            annotations = getClassAnnotations(baseType, annotationCtr, inherit).concat(annotations);
        }
    }

    return annotations;
}

export function getPropertyAnnotations(target: Constructor<any>, propertyName: string): any[];
export function getPropertyAnnotations<T>(target: Constructor<any>, propertyName: string, annotationCtr: Constructor<T>) : T[];
export function getPropertyAnnotations<T>(target: Constructor<any>, propertyName: string, annotationCtr?: Constructor<T>) : T[] {

    return matchingAnnotations(annotationCtr, getOwnMetadata(target, propertyName));
}

function matchingAnnotations<T>(annotationCtr: Constructor<T>, annotations: any[]): T[] {

    if(annotationCtr) {
        annotations = annotations.filter(annotation => annotation instanceof <any>annotationCtr);
    }

    return annotations;
}

export function hasClassAnnotation<T>(target: Constructor<any>, annotationCtr: Constructor<T>, inherit?: boolean) : boolean {

    return getClassAnnotations(target, annotationCtr, inherit).length > 0;
}


export function hasPropertyAnnotation(target: Constructor<any>, propertyName: string, annotationCtr: Constructor<any>) : boolean {

    return getPropertyAnnotations(target, propertyName, annotationCtr).length > 0;
}

function getOwnMetadata(target: Object, propertyName?: string): any[] {

    if(!propertyName) {
        return Reflect.getOwnMetadata('hydrate:annotations', target) || [];
    }

    var properties = Reflect.getOwnMetadata('hydrate:properties', target) || {};
    return properties[propertyName] || [];
}

function defineMetadata(annotations: any[], target: Object, propertyName?: string): void {

    if(!propertyName) {
        Reflect.defineMetadata('hydrate:annotations', annotations, target);
        return;
    }

    var properties = Reflect.getOwnMetadata('hydrate:properties', target) || {};
    properties[propertyName] = annotations;
    Reflect.defineMetadata('hydrate:properties', properties, target);
}
