/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import PropertyFlags = require("../mapping/propertyFlags");
import TypeMapping = require("../mapping/typeMapping");
import Property = require("../mapping/property");
import MappingRegistry = require("../mapping/mappingRegistry");
import MappingFlags = require("../mapping/typeMappingFlags");
import ReflectHelper = require("../reflectHelper");
import BuilderState = require("./builderState");
import Identifier = require("../id/identifier");

class DocumentBuilder {

    private _mappingRegistry: MappingRegistry;

    constructor(mappingRegistry: MappingRegistry) {

        this._mappingRegistry = mappingRegistry;
    }

    buildDocument(obj: any, type: reflect.Type): any {

        var state = new BuilderState();

        var document = this._buildDocument(obj, type, state, true);
        if(state.errors.length > 0) {
            throw new Error(state.getErrorMessage());
        }

        return document;
    }

    private _buildDocument(obj: any, type: reflect.Type, state: BuilderState, isRoot?: boolean): any {

        var document: any = {};

        // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
        // does not exist, default to mapping for type.
        var mapping = this._mappingRegistry.getMappingForObject(obj) || this._mappingRegistry.getMappingForType(type);
        if(!mapping) {
            state.addError("No mapping available for type '" + type.getFullName() + "'.", type, obj);
            return;
        }

        var id: Identifier;
        if(mapping.isDocumentType) {
            // TODO: what if obj is an identifier
            if(mapping.root.identityGenerator.isIdentifier(obj)) {
                return obj;
            }
            else {
                id = obj[mapping.root.identityField];
                if (!id) {
                    state.addError("Missing identifier.", type, obj);
                    return;
                }
                if (!isRoot) {
                    // If we have a document type and this is not the root object, then just save a reference to the object.
                    return id;
                }
            }
        }

        // TODO: change to use Map.hashCode
        // track embedded objects to make sure we don't have an infinite loop
        var embedded = false;
        if(mapping.isEmbeddedType) {
            if(state.visited.indexOf(obj) !== -1) {
                state.addError("Recursive reference of embedded object is not allowed.", type, obj);
                return;
            }
            state.visited.push(obj);
            embedded = true;
        }

        var properties = mapping.properties;
        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i],
                flags = property.flags;

            // skip fields that are not persisted
            if(flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }

            var value = property.symbol.getValue(obj);

            if(value == undefined || value == null) {
                // skip undefined or null values unless allowed
                if((flags & PropertyFlags.Nullable) == 0) {
                    continue;
                }
                // if nullable, store undefined values as null
                value = null;
            }
            else {
                state.path.push(property.name);
                value = this._buildValue(value, property.symbol.getType(), state);
                state.path.pop();
            }

            document[property.field] = value;
        }

        if(embedded) {
            state.visited.pop();
        }

        // add discriminator
        if(mapping.discriminatorField) {
            document[mapping.discriminatorField] = mapping.discriminatorValue;
        }

        // if this is the root then set the identifier
        if(isRoot) {
            document[mapping.root.identityField] = id;
        }

        return document;
    }

    private _buildValue(value: any, type: reflect.Type, state: BuilderState): any {

        if(type.isIntrinsic()) {
            var error: string;
            if(type.isAny()) {
                error = "Type 'any' is not supported.";
            }
            if(type.isNumber()) {
                if(typeof value !== "number") {
                    error = "Expected number.";
                    return;
                }
            }
            else
            if(type.isString()) {
                if(typeof value !== "string") {
                    error = "Expected string.";
                }
            }
            else
            if(type.isBoolean()) {
                if(typeof value !== "boolean") {
                    error = "Expected boolean.";
                }
            }

            if(error) {
                state.addError(error, type, value);
                return;
            }
            return value;
        }

        if(type.isEnum()) {
            if(typeof value !== "number") {
                state.addError("Expected enum value to be a number.", type, value);
                return;
            }
            return type.getEnumName(value);
        }

        if(type.isTuple()) {
            return this._buildTuple(value, type, state);
        }

        if(type.isArray()) {
            return this._buildArray(value, type, state);
        }

        if(ReflectHelper.isDate(type)) {

            if(!(value instanceof Date)) {
                state.addError("Expected Date.", type, value);
                return;
            }

            return new Date(value.getTime());
        }

        if(ReflectHelper.isRegExp(type)) {

            if(!(value instanceof RegExp)) {
                state.addError("Expected RegExp.", type, value);
                return;
            }

            return this._cloneRegExp(value);
        }

        return this._buildDocument(value, type, state);
    }

    private _buildTuple(source: any, sourceType: reflect.Type, state: BuilderState): any {

        var elementTypes = sourceType.getElementTypes();
        if(source.length != elementTypes.length) {
            state.addError("Expected " + elementTypes.length + " elements in tuple but source had " + source.length + ".", sourceType, source);
            return;
        }

        var ret = new Array(source.length);
        for (var i = 0, l = source.length; i < l; i++) {
            state.path.push(i);
            ret[i] = this._buildValue(source[i], elementTypes[i], state);
            state.path.pop();
        }
        return ret;
    }

    private _buildArray(source: any, sourceType: reflect.Type, state: BuilderState): any {

        if(!Array.isArray(source)) {
            state.addError("Expected array.", sourceType, source);
            return;
        }

        var elementType = sourceType.getElementType();

        var ret = new Array(source.length);
        for (var i = 0, l = source.length; i < l; i++) {
            ret[i] = this._buildValue(source[i], elementType, state);
        }
        return ret;
    }

    private _cloneRegExp(source: RegExp): RegExp {

        var flags: string[] = [];
        if(source.global) {
            flags.push('g');
        }
        if(source.multiline) {
            flags.push('m');
        }
        if(source.ignoreCase) {
            flags.push('i');
        }
        return new RegExp(source.source, flags.join(''));
    }
}

export = DocumentBuilder;