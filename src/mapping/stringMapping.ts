import MappingError = require("./mappingError");
import MappingBase = require("./mappingBase");
import MappingFlags = require("./mappingFlags");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");

class StringMapping extends MappingBase {

    constructor() {
        super(MappingFlags.String);
    }

    read(context: ReadContext, value: any): any {

        if(typeof value !== "string") {
            context.addError("Expected string.");
            return;
        }
        return value;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(typeof value !== "string") {
            errors.push({ message: "Expected string.", path: path, value: value });
            return;
        }
        return value;
    }
}

export = StringMapping;