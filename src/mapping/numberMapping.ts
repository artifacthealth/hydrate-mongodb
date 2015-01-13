import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import InternalSession = require("../internalSession");

class NumberMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Number);
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        if(typeof value !== "number") {
            errors.push({ message: "Expected number.", path: path, value: value });
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