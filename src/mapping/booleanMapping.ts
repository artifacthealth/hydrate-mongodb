import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

export class BooleanMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Boolean);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(typeof value !== "boolean") {
            context.addError("Expected boolean.");
            return;
        }
        return value;
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if(typeof value !== "boolean") {
            context.addError("Expected boolean.");
            return;
        }
        return value;
    }
}
