/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/mongodb.d.ts" />

import mongodb = require("mongodb");

import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");

class BufferMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Buffer);
    }

    read(context: ReadContext, value: any): any {

        if(!value || !value._bsontype || value._bsontype != "Binary") {
            context.addError("Expected Binary.");
            return;
        }
        return (<mongodb.Binary>value).value(true);
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(!value || !Buffer.isBuffer(value)) {
            errors.push({ message: "Expected Buffer.", path: path, value: value });
            return;
        }

        return new mongodb.Binary(value);
    }

}

export = BufferMapping;