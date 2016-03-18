import {Table} from "../core/table";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingModel} from "./mappingModel";
import {Changes} from "./changes";
import {InternalSession} from "../sessionImpl";
import {ReadContext} from "./readContext";
import {EnumType} from "./enumType";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export class EnumMapping extends MappingBase {

    ignoreCase: boolean;
    type = EnumType.String;

    private _values: Table<string> = [];

    // TODO: switch members to Map when for-of loop is supported (need granular targeting in TypeScript)
    constructor(public members: MappingModel.EnumMembers, ignoreCase?: boolean) {
        super(MappingModel.MappingFlags.Enum);

        this.ignoreCase = ignoreCase || false;

        // create map from value to name
        for(var name in members) {
            if(typeof name === "string" && members.hasOwnProperty(name)) {
                var value = members[name];
                this._values[value] = name;
            }
        }
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

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

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        if(typeof value !== "number") {
            context.addError("Expected enum value to be a number.");
            return;
        }

        switch(this.type) {
            case EnumType.Ordinal:
                return value;
            case EnumType.String:
                var name = this._values[value];
                if (!name) {
                    context.addError("Could not find enum member name for value '" + value + "'.");
                    return;
                }
                return name;
            default:
                if(this.type == null) {
                    context.addError("Enum type not specified." + this.type);
                }
                else {
                    context.addError("Unknown enum type '" + this.type + "'.");
                }
                return;
        }
    }
}
