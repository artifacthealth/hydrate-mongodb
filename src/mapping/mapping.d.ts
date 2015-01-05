import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import InternalSessionFactory = require("../internalSessionFactory");
import Changes = require("./changes");

interface Mapping {

    id: number;
    flags: MappingFlags;
    read(value: any, path: string, errors: MappingError[]): any;
    write(value: any, path: string, errors: MappingError[], visited: any[]): any;
    walk(value: any, path: string): void;
    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void;
    areEqual(documentValue1: any, documentValue2: any): boolean;
}

export = Mapping;