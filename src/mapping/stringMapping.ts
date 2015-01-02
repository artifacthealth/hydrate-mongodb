import Mapping = require("./mapping");
import MappingError = require("./mappingError");
import MappingBase = require("./mappingBase");
import MappingFlags = require("./mappingFlags");

class StringMapping extends MappingBase {

    constructor() {
        super(MappingFlags.String);
    }

    read(value: any, path: string, errors: MappingError[]): any {

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

    walk(value: any, path: string): void {

    }

    compare(from: any, to: any): void {

    }
}

export = StringMapping;