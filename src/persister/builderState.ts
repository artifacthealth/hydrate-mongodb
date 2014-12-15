/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");
import BuilderError = require("./builderError");

class BuilderState {

    path: any[] = []; // TODO: change type to string|number in TypeScript 1.4
    visited: any[] = [];
    errors: BuilderError[] = [];

    addError(message: string, type: reflect.Type, value: any): void {

        this.errors.push({
            message: message,
            type: type,
            value: value,
            path: this.path.join(".")
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

export = BuilderState;