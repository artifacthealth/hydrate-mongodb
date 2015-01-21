import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import InternalSessionFactory = require("../internalSessionFactory");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");

interface Mapping {

    id: number;
    flags: MappingFlags;
    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any;
    write(value: any, path: string, errors: MappingError[], visited: any[]): any;
    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void;
    areEqual(documentValue1: any, documentValue2: any): boolean;
    resolve(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
    resolveInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void;
}

export = Mapping;