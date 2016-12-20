import {MappingError} from "./mappingError";
import {MappingBase} from "./mappingBase";
import {MappingModel} from "./mappingModel";
import {InternalSession} from "../session";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export class AnyMapping extends MappingBase {

    constructor() {
        super(MappingModel.MappingFlags.String);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        return value;
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        return value;
    }
}
