import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

export class DateMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Date);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(!(value instanceof Date)) {
            context.addError("Expected Date.");
            return;
        }
        return new Date(value.getTime());
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if(!(value instanceof Date)) {
            context.addError("Expected Date.");
            return;
        }
        return new Date(value.getTime());
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 instanceof Date && documentValue2 instanceof Date) {
            return documentValue1.getTime() == documentValue2.getTime();
        }

        return false;
    }
}
