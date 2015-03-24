var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MappingBase = require("./mappingBase");
var DateMapping = (function (_super) {
    __extends(DateMapping, _super);
    function DateMapping() {
        _super.call(this, 8 /* Date */);
    }
    DateMapping.prototype.read = function (context, value) {
        if (!(value instanceof Date)) {
            context.addError("Expected Date.");
            return;
        }
        return new Date(value.getTime());
    };
    DateMapping.prototype.write = function (value, path, errors, visited) {
        if (!(value instanceof Date)) {
            errors.push({ message: "Expected Date.", path: path, value: value });
            return;
        }
        return new Date(value.getTime());
    };
    DateMapping.prototype.areEqual = function (documentValue1, documentValue2) {
        if (documentValue1 instanceof Date && documentValue2 instanceof Date) {
            return documentValue1.getTime() == documentValue2.getTime();
        }
        return false;
    };
    return DateMapping;
})(MappingBase);
module.exports = DateMapping;
