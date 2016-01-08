import {MappingError} from "./mappingError";
import {MappingBase} from "./mappingBase";
import {MappingFlags} from "./mappingFlags";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";

export abstract class VirtualMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Virtual);
    }

    abstract read(context: ReadContext, value: any): any;

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        // Virtual values are not persisted
    }
}
