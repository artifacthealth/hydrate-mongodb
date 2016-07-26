import {Table} from "../core/table";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingModel} from "./mappingModel";
import {Changes} from "./changes";
import {InternalSession} from "../session";
import {ReadContext} from "./readContext";
import {PropertyConverter} from "../config/configuration";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export class ConverterMapping extends MappingBase {

    constructor(public converter: PropertyConverter) {
        super(MappingModel.MappingFlags.Converter);
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        var result = this.converter.convertToObjectProperty(value);

        if (result === undefined) {
            context.addError("Unable to convert '" + value + "' to object property.");
        }

        return result;
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        var result = this.converter.convertToDocumentField(value);

        if (result === undefined) {
            context.addError("Unable to convert '" + value + "' to document field.");
        }

        return result;
    }
    
    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (documentValue1 === documentValue2) return true;
        if (documentValue1 === null || documentValue2 === null) return false;
        if (documentValue1 !== documentValue1 && documentValue2 !== documentValue2) return true; // NaN === NaN

        return false;
    }
}
