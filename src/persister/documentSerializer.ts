/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import PropertyFlags = require("../mapping/propertyFlags");
import TypeMapping = require("../mapping/typeMapping");
import Property = require("../mapping/property");
import InternalSession = require("../internalSession");
import InternalSessionFactory = require("../internalSessionFactory");
import ReflectHelper = require("../core/reflectHelper");
import RegExpUtil = require("../core/regExpUtil");
import Identifier = require("../id/identifier");

interface SerializerError {

    message: string;
    type: reflect.Type;
    value: any;
    path: string;
}

class SerializerState {

    visited: any[] = [];
    errors: SerializerError[] = [];

    addError(message: string, path: string, type: reflect.Type, value: any): void {

        this.errors.push({
            message: message,
            type: type,
            value: value,
            path: path
        });
    }

    getErrorMessage(): string {

        var message: string[] = [];

        for(var i = 0, l = this.errors.length; i < l; i++) {
            var error = this.errors[i];
            message.push(error.path, ": ", error.message, "\n");
        }

        return message.join("");
    }
}

class Serializer {

    private _factory: InternalSessionFactory;
    private _type: reflect.Type;

    constructor(factory: InternalSessionFactory, type: reflect.Type) {

        this._factory = factory;
        this._type = type;
    }

    read(document: any): any {

        var state = new SerializerState();

        var obj = this._readObject(document, this._type, state);
        if(state.errors.length > 0) {
            throw new Error(state.getErrorMessage());
        }

        return obj;
    }

    write(obj: any): any {

        var state = new SerializerState();

        var document = this._writeObject(obj, this._type, state);
        if(state.errors.length > 0) {
            throw new Error(state.getErrorMessage());
        }

        return document;
    }

    private _readObject(document: any, type: reflect.Type, state: SerializerState, path?: string): any {

        var base = path ? path + "." : "";
        var mapping = this._factory.getMappingForType(type);
        if(!mapping) {
            return state.addError("No mapping available for type '" + type.getFullName() + "'.", path, type, document);
        }

        var isRoot = path === undefined;
        if(mapping.isDocumentType) {
            if(isRoot) {
                var id = document["_id"];
                if(!id) {
                    return state.addError("Missing identifier.", path, type, document);
                }
            }
            else {
                var id = document;
            }
            // TODO: handle DBRef
            if(!mapping.root.identity.validate(id)) {
                return state.addError("'" + id.toString() + "' is not a valid identifier.", base + "_id", type, id);
            }
            // TODO: resolve reference here or do later?
            // if this is not the root document then just return the id
            if(!isRoot) {
                return id;
            }
        }

        // get mapping based on discriminator field if one exists
        if(mapping.root && mapping.root.discriminatorField) {
            var discriminatorValue = document[mapping.root.discriminatorField];
            if(discriminatorValue === undefined) {
                return state.addError("Expected discriminator field '" + mapping.root.discriminatorField + "'.", path, type, document);
            }
            mapping = mapping.getMappingByDiscriminator(discriminatorValue);
            if(mapping === undefined) {
                return state.addError("Unknown discriminator value '" + discriminatorValue + "'.", path, type, document);
            }
        }

        var obj: any = mapping.type.isClass() ? mapping.type.createObject() : {};
        // if this is the root then set the identifier
        if(isRoot) {
            // TODO: allow mapping to map document identifier field to different property on object
            obj["_id"] = id;
        }

        var properties = mapping.properties;
        for(var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            // skip fields that are not persisted
            if(property.flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }
            // TODO: how to handle inverse side of reference

            var value = document[property.field];
            if(value === undefined) {
                // skip undefined values
                continue;
            }
            if(value === null) {
                // skip null values unless allowed
                if(!(property.flags & PropertyFlags.Nullable)) {
                    continue;
                }
            }
            else {
                value = this._readValue(value, property.symbol.getType(), state, base + property.name);
            }
            property.symbol.setValue(obj, value);
        }

        return obj;
    }

    private _readValue(value: any, type: reflect.Type, state: SerializerState, path: string): any {

        if(type.isIntrinsic()) {
            if(type.isAny()) {
                return state.addError("Type 'any' is not supported.", path, type, value);
            }
            if(type.isNumber()) {
                if(typeof value !== "number") {
                    return state.addError("Expected number.", path, type, value);
                }
            }
            else
            if(type.isString()) {
                if(typeof value !== "string") {
                    return state.addError("Expected string.", path, type, value);
                }
            }
            else
            if(type.isBoolean()) {
                if(typeof value !== "boolean") {
                    return state.addError("Expected boolean.", path, type, value);
                }
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
            return state.addError("Enum value must be a string or number.", path, type, value);
        }

        if(type.isTuple()) {
            if(!Array.isArray(value)) {
                return state.addError("Expected tuple.", path, type, value);
            }

            var elementTypes = type.getElementTypes();
            if(value.length != elementTypes.length) {
                return state.addError("Expected " + elementTypes.length + " elements in tuple but source had " + value.length + ".", path, type, value);
            }

            var ret = new Array(value.length);
            for (var i = 0, l = value.length; i < l; i++) {
                ret[i] = this._readValue(value[i], elementTypes[i], state, path + i);
            }
            return ret;
        }

        if(type.isArray()) {
            if(!Array.isArray(value)) {
                return state.addError("Expected array.", path, type, value);
            }

            var elementType = type.getElementType();

            var ret = new Array(value.length);
            for (var i = 0, l = value.length; i < l; i++) {
                ret[i] = this._readValue(value[i], elementType, state, path);
            }
            return ret;
        }

        if(ReflectHelper.isDate(type)) {
            if(!(value instanceof Date)) {
                return state.addError("Expected Date.", path, type, value);
            }
            return new Date(value.getTime());
        }

        if(ReflectHelper.isRegExp(type)) {
            if(!(value instanceof RegExp)) {
                return state.addError("Expected RegExp.", path, type, value);
            }
            return RegExpUtil.clone(value);
        }

        return this._readObject(value, type, state, path);
    }

    private _writeObject(obj: any, type: reflect.Type, state: SerializerState, path?: string): any {

        var document: any = {};
        var base = path ? path + "." : "";

        // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
        // does not exist, default to mapping for type.
        var mapping = this._factory.getMappingForObject(obj) || this._factory.getMappingForType(type);
        if(!mapping) {
            return state.addError("No mapping available for type '" + type.getFullName() + "'.", path, type, obj);
        }

        var isRoot = path === undefined;
        if(mapping.isDocumentType) {
            // if the object is not an instance of the entity's constructor then it should be an identifier or DBRef
            if(!(obj instanceof mapping.classConstructor)) {
                // TODO: handle DBRef
                var id = obj;
            }
            else {
                var id = obj["_id"];
                if (!id) {
                    return state.addError("Missing identifier.", path, type, obj);
                }
            }
            if(!mapping.root.identity.validate(id)) {
                return state.addError("'" + id.toString() + "' is not a valid identifier.", base + "_id", type, id);
            }
            if(isRoot) {
                // if this is the root then set the identifier
                document["_id"] = id;
            }
            else {
                // otherwise, save a reference
                // TODO: decide when to save reference as a DBRef
                return id;
            }
        }

        // TODO: change to use Map.hashCode
        // track embedded objects to make sure we don't have an infinite loop
        var embedded = false;
        if(mapping.isEmbeddedType) {
            if(state.visited.indexOf(obj) !== -1) {
                state.addError("Recursive reference of embedded object is not allowed.", path, type, obj);
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
            if(value === undefined) {
                // skip undefined values
                continue;
            }
            if(value === null) {
                // skip null values unless allowed
                if(!(flags & PropertyFlags.Nullable)) {
                    continue;
                }
            }
            else {
                value = this._writeValue(value, property.symbol.getType(), state, base + property.name);
            }
            document[property.field] = value;
        }

        if(embedded) {
            state.visited.pop();
        }

        // add discriminator
        if(mapping.root && mapping.root.discriminatorField) {
            document[mapping.root.discriminatorField] = mapping.discriminatorValue;
        }

        return document;
    }

    private _writeValue(value: any, type: reflect.Type, state: SerializerState, path: string): any {

        if(type.isIntrinsic()) {
            if(type.isAny()) {
                return state.addError("Type 'any' is not supported.", path, type, value);
            }
            if(type.isNumber()) {
                if(typeof value !== "number") {
                    return state.addError("Expected number.", path, type, value);
                }
            }
            else
            if(type.isString()) {
                if(typeof value !== "string") {
                    return state.addError("Expected string.", path, type, value);
                }
            }
            else
            if(type.isBoolean()) {
                if(typeof value !== "boolean") {
                    return state.addError("Expected boolean.", path, type, value);
                }
            }
            return value;
        }

        if(type.isEnum()) {
            if(typeof value !== "number") {
                return state.addError("Expected enum value to be a number.", path, type, value);
            }
            // TODO: default enum to number?
            // TODO: save as number if name is not found? e.g. when used as bitmap
            return type.getEnumName(value);
        }

        if(type.isTuple()) {
            if(!Array.isArray(value)) {
                return state.addError("Expected tuple.", path, type, value);
            }

            var elementTypes = type.getElementTypes();
            if(value.length != elementTypes.length) {
                return state.addError("Expected " + elementTypes.length + " elements in tuple but source had " + value.length + ".", path, type, value);
            }

            var ret = new Array(value.length);
            for (var i = 0, l = value.length; i < l; i++) {
                ret[i] = this._writeValue(value[i], elementTypes[i], state, path + i);
            }
            return ret;
        }

        // TODO: handle indexed type

        if(type.isArray()) {
            if(!Array.isArray(value)) {
                return state.addError("Expected array.", path, type, value);
            }

            var elementType = type.getElementType();

            var ret = new Array(value.length);
            for (var i = 0, l = value.length; i < l; i++) {
                ret[i] = this._writeValue(value[i], elementType, state, path);
            }
            return ret;
        }

        if(ReflectHelper.isDate(type)) {
            if(!(value instanceof Date)) {
                return state.addError("Expected Date.", path, type, value);
            }
            return new Date(value.getTime());
        }

        if(ReflectHelper.isRegExp(type)) {
            if(!(value instanceof RegExp)) {
                return state.addError("Expected RegExp.", path, type, value);
            }
            return RegExpUtil.clone(value);
        }

        return this._writeObject(value, type, state, path);
    }
}

export = Serializer;