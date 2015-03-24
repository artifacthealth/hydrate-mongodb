var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var NumberMapping = (function (_super) {
    __extends(NumberMapping, _super);
    function NumberMapping() {
        _super.call(this, 32 /* Number */);
    }
    NumberMapping.prototype.read = function (context, value) {
        if (typeof value !== "number") {
            context.addError("Expected number.");
            return;
        }
        return value;
    };
    NumberMapping.prototype.write = function (value, path, errors, visited) {
        if (typeof value !== "number") {
            errors.push({ message: "Expected number.", path: path, value: value });
            return;
        }
        return value;
    };
    return NumberMapping;
})(MappingBase);
module.exports = NumberMapping;
