/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/mongodb.d.ts" />

import {Binary} from "mongodb";

import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

export class BufferMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Buffer);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(!value._bsontype || value._bsontype != "Binary") {
            context.addError("Expected Binary.");
            return;
        }
        return (<Binary>value).value(true);
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(value == null) return null;

        if(!Buffer.isBuffer(value)) {
            errors.push({ message: "Expected Buffer.", path: path, value: value });
            return;
        }

        return new Binary(value);
    }

}
