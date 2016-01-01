import {Table} from "../core/table";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {InternalSession} from "../internalSession";
import {ReadContext} from "./readContext";
import {PropertyConverter} from "./propertyConverter";

export class ConverterMapping extends MappingBase {

    constructor(public converter: PropertyConverter) {
        super(MappingFlags.Converter);
    }

    read(context: ReadContext, value: any): any {

        var result = this.converter.convertToObjectProperty(value);

        if (result === undefined) {
            context.addError("Unable to convert '" + value + "' to object property.");
        }

        return result;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        var result = this.converter.convertToDocumentField(value);

        if (result === undefined) {
            errors.push({
                message: "Unable to convert '" + value + "' to document field.",
                path: path,
                value: value
            });
        }

        return result;
    }
}
