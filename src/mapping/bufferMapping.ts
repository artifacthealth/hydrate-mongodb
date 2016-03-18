import {Binary} from "mongodb";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingModel} from "./mappingModel";
import {InternalSession} from "../sessionImpl";
import {ReadContext} from "./readContext";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export class BufferMapping extends MappingBase {

    constructor() {
        super(MappingModel.MappingFlags.Buffer);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        if(!value._bsontype || value._bsontype != "Binary") {
            context.addError("Expected Binary.");
            return;
        }
        return (<Binary>value).value(true);
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if(!Buffer.isBuffer(value)) {
            context.addError("Expected Buffer.");
            return;
        }

        return new Binary(value);
    }

}
