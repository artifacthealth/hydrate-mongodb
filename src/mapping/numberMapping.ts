import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");

class NumberMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Number);
    }

    read(value: any, path: string, errors: MappingError[]): any {

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

    walk(value: any, path: string): void {

    }

    compare(from: any, to: any): void {

    }
}

export = NumberMapping;