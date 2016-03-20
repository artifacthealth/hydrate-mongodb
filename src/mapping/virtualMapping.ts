import {MappingError} from "./mappingError";
import {MappingBase} from "./mappingBase";
import {MappingModel} from "./mappingModel";
import {InternalSession} from "../session";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export abstract class VirtualMapping extends MappingBase {

    constructor() {
        super(MappingModel.MappingFlags.Virtual);
    }

    abstract read(context: ReadContext, value: any): any;

    write(context: WriteContext, value: any): any {

        // Virtual values are not persisted
    }
}
