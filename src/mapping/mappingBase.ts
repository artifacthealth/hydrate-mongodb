import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");

var nextMappingId = 1;

class MappingBase {

    id: number;

    constructor(public flags: MappingFlags) {
        this.id = nextMappingId++;
    }

    read(value: any, path: string, errors: MappingError[]): any {
        throw new Error("Not implemented");
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {
        throw new Error("Not implemented");
    }

    walk(value: any, path: string): void {
        throw new Error("Not implemented");
    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        if(objectValue !== documentValue) {
            (changes["$set"] || (changes["$set"] = {}))[path] = objectValue;
        }
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 === documentValue2) return true;
        if (documentValue1 === null || documentValue2 === null) return false;
        if (documentValue1 !== documentValue1 && documentValue2 !== documentValue2) return true; // NaN === NaN

        return false;
    }
}

export = MappingBase;