import Map = require("../core/map");
import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import InternalSession = require("../internalSession");

interface EnumValues {
    [value: number]: string;
}

class EnumMapping extends MappingBase {

    ignoreCase = false;

    private _values: EnumValues = {};

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

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

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
                errors.push({message: "'" + value + "' is not a valid enum value.", path: path, value: value});
            }
            return result;
        }

        errors.push({ message: "Enum value must be a string or number.", path: path, value: value });
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

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        // TODO: handle errors/visited
       super.compare(this.write(objectValue, path, [], []), documentValue, changes, path);
    }
}

export = EnumMapping;