import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");

class DateMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Date);
    }

    read(value: any, path: string, errors: MappingError[]): any {

        if(!(value instanceof Date)) {
            errors.push({ message: "Expected Date.", path: path, value: value });
            return;
        }
        return new Date(value.getTime());
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(!(value instanceof Date)) {
            errors.push({ message: "Expected Date.", path: path, value: value });
            return;
        }
        return new Date(value.getTime());
    }

    walk(value: any, path: string): void {

    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // TODO: throw if objectValue is not Date

        var objectTime = objectValue.getTime();
        if(documentValue instanceof Date && objectTime === documentValue.getTime()) {
            return;
        }

        (changes["$set"] || (changes["$set"] = {}))[path] = new Date(objectTime);
    }
}

export = DateMapping;