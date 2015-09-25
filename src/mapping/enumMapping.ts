import Table = require("../core/table");
import Map = require("../core/map");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import InternalSession = require("../internalSession");
import ReadContext = require("./readContext");
import EnumType = require("./enumType");

class EnumMapping extends MappingBase {

    ignoreCase = false;
    type = EnumType.Ordinal;

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

        switch(this.type) {
            case EnumType.Ordinal:
                return value;
            case EnumType.String:
                var name = this._values[value];
                if (!name) {
                    errors.push({
                        message: "Could not find enum member name for value '" + value + "'.",
                        path: path,
                        value: value
                    });
                    return;
                }
                return name;
            default:
                if(this.type == null) {
                    errors.push({message: "Enum type not specified." + this.type, path: path, value: value});
                }
                else {
                    errors.push({message: "Unknown enum type '" + this.type + "'.", path: path, value: value});
                }
                return;
        }
    }
}

export = EnumMapping;