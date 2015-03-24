var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var EnumMapping = (function (_super) {
    __extends(EnumMapping, _super);
    function EnumMapping(members) {
        _super.call(this, 16 /* Enum */);
        this.members = members;
        this.ignoreCase = false;
        this._values = [];
        for (var name in members) {
            if (members.hasOwnProperty(name)) {
                var value = members[name];
                this._values[value] = name;
            }
        }
    }
    EnumMapping.prototype.read = function (context, value) {
        if (typeof value === "number") {
            return value;
        }
        if (typeof value === "string") {
            if (!this.ignoreCase) {
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
    };
    EnumMapping.prototype.write = function (value, path, errors, visited) {
        if (typeof value !== "number") {
            errors.push({ message: "Expected enum value to be a number.", path: path, value: value });
            return;
        }
        // TODO: default enum to number?
        // TODO: option to allow values that are not contained in enum. needed for when used as bitmap.
        // TODO: perhaps store enums as numbers by default?
        var name = this._values[value];
        if (!name) {
            errors.push({ message: "Could not find enum member name for value '" + value + "'.", path: path, value: value });
            return;
        }
        return name;
    };
    return EnumMapping;
})(MappingBase);
module.exports = EnumMapping;
