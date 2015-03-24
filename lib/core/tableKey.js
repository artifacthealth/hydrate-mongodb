/**
 * Gets or sets hidden key associated with arbitrary object for use in indexing an array-based table.
 */
var TableKey = (function () {
    function TableKey() {
        this._nextValue = 0;
        this._name = "__key" + (TableKey._nextKeyId++).toString() + (new Date().getTime().toString()) + "__";
        // V8 cannot optimize property access if variable is used for property name, so we generate a function for access.
        // See Angular design doc here: http://tinyurl.com/kap2g2r
        this.getValue = (new Function("o", "return o['" + this._name + "']"));
        this.hasValue = (new Function("o", "return o['" + this._name + "'] !== undefined"));
    }
    TableKey.prototype.ensureValue = function (obj) {
        var value = this.getValue(obj);
        if (value !== undefined)
            return value;
        return this.setValue(obj, this._nextValue++);
    };
    TableKey.prototype.setValue = function (obj, value) {
        if (!Object.isExtensible(obj)) {
            throw new Error("Cannot set key for object that is not extensible.");
        }
        Object.defineProperty(obj, this._name, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: value
        });
        return value;
    };
    TableKey._nextKeyId = 0;
    return TableKey;
})();
module.exports = TableKey;
