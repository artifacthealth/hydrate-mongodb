import {Table} from "../core/table";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingModel} from "./mappingModel";
import {Changes} from "./changes";
import {InternalSession} from "../sessionImpl";
import {ReadContext} from "./readContext";
import {PropertyConverter} from "./propertyConverter";
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
}
