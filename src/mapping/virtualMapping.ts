import {MappingError} from "./mappingError";
import {MappingBase} from "./mappingBase";
import {MappingFlags} from "./mappingFlags";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

export abstract class VirtualMapping extends MappingBase {

    constructor() {
        super(MappingFlags.Virtual);
    }

    abstract read(context: ReadContext, value: any): any;

    write(context: WriteContext, value: any): any {

        // Virtual values are not persisted
    }
}
