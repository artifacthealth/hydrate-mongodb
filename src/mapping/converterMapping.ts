import Table = require("../core/table");
import Map = require("../core/map");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");
import PropertyConverter = require("./propertyConverter");

class ConverterMapping extends MappingBase {

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

export = ConverterMapping;