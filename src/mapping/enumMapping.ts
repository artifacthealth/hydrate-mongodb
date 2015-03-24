import Table = require("../core/table");
import Map = require("../core/map");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");

class EnumMapping extends MappingBase {

    ignoreCase = false;

    private _values: Table<string> = [];

    constructor(public members: Map<number>) {
        super(MappingFlags.Enum);

        // create map from value to name
        for(var name in members) {
            if(members.hasOwnProperty(name)) {
                var value = members[name];
                this._values[value] = name;
            }
        }
    }

    read(context: ReadContext, value: any): any {

        if(typeof value === "number") {
            return value;
        }

        if(typeof value === "string") {
            if(!this.ignoreCase) {
                 var result = this.members[value];
            }
            else {
                value = value.toLowerCase();

                for (var name in this.members) {
                    if (this.members.hasOwnProperty(name) && typeof name === "string") {
                        if (name.toLowerCase() === value) {
                            var result = this.members[name];
                            break;
                        }
                    }
                }
            }

            if (result === undefined) {
                context.addError("'" + value + "' is not a valid enum value.");
            }
            return result;
        }

        context.addError("Enum value must be a string or number.");
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(typeof value !== "number") {
            errors.push({ message: "Expected enum value to be a number.", path: path, value: value });
            return;
        }

        // TODO: default enum to number?
        // TODO: option to allow values that are not contained in enum. needed for when used as bitmap.
        // TODO: perhaps store enums as numbers by default?
        var name = this._values[value];
        if(!name) {
            errors.push({ message: "Could not find enum member name for value '" + value + "'.", path: path, value: value });
            return;
        }
        return name;
    }
}

export = EnumMapping;