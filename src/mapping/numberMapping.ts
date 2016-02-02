import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

export class NumberMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Number);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(typeof value !== "number") {
            context.addError("Expected number.");
            return;
        }
        return value;
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if(typeof value !== "number") {
            context.addError("Expected number.");
            return;
        }
        return value;
    }
}
