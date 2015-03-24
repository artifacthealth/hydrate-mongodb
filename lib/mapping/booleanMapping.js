var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var BooleanMapping = (function (_super) {
    __extends(BooleanMapping, _super);
    function BooleanMapping() {
        _super.call(this, 2 /* Boolean */);
    }
    BooleanMapping.prototype.read = function (context, value) {
        if (typeof value !== "boolean") {
            context.addError("Expected boolean.");
            return;
        }
        return value;
    };
    BooleanMapping.prototype.write = function (value, path, errors, visited) {
        if (typeof value !== "boolean") {
            errors.push({ message: "Expected boolean.", path: path, value: value });
            return;
        }
        return value;
    };
    return BooleanMapping;
})(MappingBase);
module.exports = BooleanMapping;
