import {Binary} from "mongodb";
import {MappingBase} from "./mappingBase";
import {MappingModel} from "./mappingModel";
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
        // dts is wrong. value is defined as Binary.prototype.value = function value(asRaw) {
        return (<any>value).value(true);
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if(!Buffer.isBuffer(value)) {
            context.addError("Expected Buffer.");
            return;
        }

        return new Binary(value);
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 === documentValue2) return true;
        if (documentValue1 == null || documentValue2 == null) return false;
        
        return documentValue1.value(true).equals(documentValue2.value(true));
    }
}
