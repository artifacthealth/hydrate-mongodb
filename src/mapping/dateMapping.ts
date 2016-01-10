import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

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

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(value == null) return null;

        if(!(value instanceof Date)) {
            errors.push({ message: "Expected Date.", path: path, value: value });
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
