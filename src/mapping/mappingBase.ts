import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");
import ResolveContext = require("./resolveContext");

var nextMappingId = 1;

class MappingBase {

    id: number;

    constructor(public flags: MappingFlags) {
        this.id = nextMappingId++;
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {
        throw new Error("Not implemented");
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {
        throw new Error("Not implemented");
    }

    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 === documentValue2) return true;
        if (documentValue1 === null || documentValue2 === null) return false;
        if (documentValue1 !== documentValue1 && documentValue2 !== documentValue2) return true; // NaN === NaN

        return false;
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(depth == path.length) {
            callback(null, value);
        }
        else {
            callback(new Error("Undefined property '" + path[depth] + "' in path '"+ path.join(".") + "'."));
        }
    }

    fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void {

        callback(new Error("Mapping does not support inverse relationships."));
    }

    resolve(context: ResolveContext): void {

        if(!context.isEop) {
            context.setError("Undefined property.");
        }
    }

}

export = MappingBase;