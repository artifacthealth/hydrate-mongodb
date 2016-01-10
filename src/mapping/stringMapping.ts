import {MappingError} from "./mappingError";
import {MappingBase} from "./mappingBase";
import {MappingFlags} from "./mappingFlags";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

export class StringMapping extends MappingBase {

    constructor() {
        super(MappingFlags.String);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(typeof value !== "string") {
            context.addError("Expected string.");
            return;
        }
        return value;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(value == null) return null;

        if(typeof value !== "string") {
            errors.push({ message: "Expected string.", path: path, value: value });
            return;
        }
        return value;
    }
}
