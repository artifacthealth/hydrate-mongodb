import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

export class NumberMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Number);
    }

    read(context: ReadContext, value: any): any {

        if(typeof value !== "number") {
            context.addError("Expected number.");
            return;
        }
        return value;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(typeof value !== "number") {
            errors.push({ message: "Expected number.", path: path, value: value });
            return;
        }
        return value;
    }
}
