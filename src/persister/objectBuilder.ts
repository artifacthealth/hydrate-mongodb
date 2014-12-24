/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import PropertyFlags = require("../mapping/propertyFlags");
import TypeMapping = require("../mapping/typeMapping");
import Property = require("../mapping/property");
import MappingRegistry = require("../mapping/mappingRegistry");
import ReflectHelper = require("../reflectHelper");
import BuilderState = require("./builderState");
import Identifier = require("../id/identifier");

class ObjectBuilder {

    private _mappingRegistry: MappingRegistry;

    constructor(mappingRegistry: MappingRegistry) {

        this._mappingRegistry = mappingRegistry;
    }

    buildObject(document: any, type: reflect.Type): any {

        var state = new BuilderState();

        var obj = this._buildObject(document, type, state, true);
        if(state.errors.length > 0) {
            throw new Error(state.getErrorMessage());
        }

        return obj;
    }

    private _buildObject(document: any, type: reflect.Type, state: BuilderState, isRoot?: boolean): any {

        var mapping = this._mappingRegistry.getMappingForType(type);
        if(!mapping) {
            state.addError("No mapping available for type '" + type.getFullName() + "'.", type, document);
            return;
        }

        var obj: any = mapping.type.isClass() ? mapping.type.createObject() : {};

        var id: Identifier;
        if(mapping.isDocumentType) {
            if(isRoot) {
                // TODO: allow mapping to map document identifier field to different property on object
                id = document["_id"];
                if(!id) {
                    state.addError("Missing identifier.", type, document);
                    return;
                }
            }
            else {
                // TODO: how to handle reference
                return document;
            }
        }

        // get mapping based on discriminator field if one exists
        if(mapping.root.discriminatorField) {
            var discriminatorValue = document[mapping.root.discriminatorField];
            if(discriminatorValue === undefined) {
                state.addError("Expected discriminator field '" + mapping.root.discriminatorField + "'.", type, document);
                return;
            }
            mapping = mapping.getMappingByDiscriminator(discriminatorValue);
            if(mapping == undefined) {
                state.addError("Unknown discriminator value '" + discriminatorValue + "'.", type, document);
                return;
            }
        }

        var properties = mapping.properties;
        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i],
                flags = property.flags;

            // skip fields that are not persisted
            if(flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }
            // TODO: how to handle inverse side of reference

            var value = document[property.field];
            if(value == undefined || value == null) {
                continue;
            }

            state.path.push(property.name);
            property.symbol.setValue(obj, this._buildValue(value, property.symbol.getType(), state));
            state.path.pop();
        }

        // if this is the root then set the identifier
        if(isRoot) {
            obj["_id"] = id;
        }

        return obj;
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
            if(typeof value == "string") {
                return type.getEnumValue(value);
            }
            if(typeof value == "number") {
                return value;
            }
            state.addError("Enum value must be a string or number.", type, value);
            return;
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

        return this._buildObject(value, type, state);
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
            state.path.push(i);
            ret[i] = this._buildValue(source[i], elementType, state);
            state.path.pop();
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

export = ObjectBuilder;