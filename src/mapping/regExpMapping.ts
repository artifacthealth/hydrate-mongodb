import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import RegExpUtil = require("../core/regExpUtil");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import InternalSession = require("../internalSession");

class RegExpMapping extends MappingBase {

    constructor() {
        super(MappingFlags.RegExp);
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        if(!(value instanceof RegExp)) {
            errors.push({ message: "Expected RegExp.", path: path, value: value });
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

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // TODO: throw if objectValue is not RegExp

        if(documentValue instanceof RegExp && objectValue.toString() === documentValue.toString()) {
            return;
        }

        (changes["$set"] || (changes["$set"] = {}))[path] = RegExpUtil.clone(objectValue);
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 instanceof RegExp && documentValue2 instanceof RegExp) {
            return documentValue1.toString() == documentValue2.toString();
        }

        return false;
    }
}

export = RegExpMapping;