import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

export class BooleanMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Boolean);
    }

    read(context: ReadContext, value: any): any {

        if(typeof value !== "boolean") {
            context.addError("Expected boolean.");
            return;
        }
        return value;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(typeof value !== "boolean") {
            errors.push({ message: "Expected boolean.", path: path, value: value });
            return;
        }
        return value;
    }
}
