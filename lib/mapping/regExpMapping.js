var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var RegExpUtil = require("../core/regExpUtil");
var RegExpMapping = (function (_super) {
    __extends(RegExpMapping, _super);
    function RegExpMapping() {
        _super.call(this, 128 /* RegExp */);
    }
    RegExpMapping.prototype.read = function (context, value) {
        if (!(value instanceof RegExp)) {
            context.addError("Expected RegExp.");
            return;
        }
        return RegExpUtil.clone(value);
    };
    RegExpMapping.prototype.write = function (value, path, errors, visited) {
        if (!(value instanceof RegExp)) {
            errors.push({ message: "Expected RegExp.", path: path, value: value });
            return;
        }
        return RegExpUtil.clone(value);
    };
    RegExpMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        if (documentValue1 instanceof RegExp && documentValue2 instanceof RegExp) {
            return documentValue1.toString() == documentValue2.toString();
        }
        return false;
    };
    return RegExpMapping;
})(MappingBase);
module.exports = RegExpMapping;
