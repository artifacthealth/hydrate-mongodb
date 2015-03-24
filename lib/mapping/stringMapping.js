var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var StringMapping = (function (_super) {
    __extends(StringMapping, _super);
    function StringMapping() {
        _super.call(this, 256 /* String */);
    }
    StringMapping.prototype.read = function (context, value) {
        if (typeof value !== "string") {
            context.addError("Expected string.");
            return;
        }
        return value;
    };
    StringMapping.prototype.write = function (value, path, errors, visited) {
        if (typeof value !== "string") {
            errors.push({ message: "Expected string.", path: path, value: value });
            return;
        }
        return value;
    };
    return StringMapping;
})(MappingBase);
module.exports = StringMapping;
