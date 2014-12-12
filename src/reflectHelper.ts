/// <reference path="../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");

module ReflectHelper {

    var _globalDateType: reflect.Type;
    var _globalRegExpType: reflect.Type;

    export function isDate(type: reflect.Type): boolean {

        if(_globalDateType === undefined) {
            _globalDateType = reflect.resolve("Date").getDeclaredType();
        }

        return _globalDateType === type;
    }

    export function isRegExp(type: reflect.Type): boolean {

        if(_globalRegExpType === undefined) {
            _globalRegExpType = reflect.resolve("RegExp").getDeclaredType();
        }

        return _globalRegExpType === type;
    }

    export function isNativeType(type: reflect.Type): boolean {

        return isDate(type) || isRegExp(type);
    }
}

export = ReflectHelper;