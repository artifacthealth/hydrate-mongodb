/// <reference path="../../typings/tsreflect.d.ts" />

import reflect = require("tsreflect");

interface BuilderError {

    message: string;
    type: reflect.Type;
    value: any;
    path: string;
}

export = BuilderError;