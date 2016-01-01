import * as RegExpUtil from "../core/regExpUtil";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

export class RegExpMapping extends MappingBase {

    constructor() {
        super(MappingFlags.RegExp);
    }

    read(context: ReadContext, value: any): any {

        if(!(value instanceof RegExp)) {
            context.addError("Expected RegExp.");
            return;
        }
        return RegExpUtil.clone(value);
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(!(value instanceof RegExp)) {
            errors.push({ message: "Expected RegExp.", path: path, value: value });
            return;
        }
        return RegExpUtil.clone(value);
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 instanceof RegExp && documentValue2 instanceof RegExp) {
            return documentValue1.toString() == documentValue2.toString();
        }

        return false;
    }
}
