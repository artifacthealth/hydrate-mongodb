import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");

class BooleanMapping extends MappingBase {

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

export = BooleanMapping;