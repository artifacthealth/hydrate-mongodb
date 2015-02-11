import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import InternalSessionFactory = require("../internalSessionFactory");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");
import ResolveContext = require("./resolveContext");

interface Mapping {

    id: number;
    flags: MappingFlags;
    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any;
    write(value: any, path: string, errors: MappingError[], visited: any[]): any;
    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
    areEqual(documentValue1: any, documentValue2: any): boolean;
    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
    fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void;
    resolve(context: ResolveContext): void;
}

export = Mapping;