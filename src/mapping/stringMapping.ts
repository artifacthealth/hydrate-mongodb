import Mapping = require("./mapping");
import MappingError = require("./mappingError");
import MappingBase = require("./mappingBase");
import MappingFlags = require("./mappingFlags");
import InternalSession = require("../internalSession");

class StringMapping extends MappingBase {

    constructor() {
        super(MappingFlags.String);
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        if(typeof value !== "string") {
            errors.push({ message: "Expected string.", path: path, value: value });
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