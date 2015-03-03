import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");

class NumberMapping extends MappingBase {

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

export = NumberMapping;