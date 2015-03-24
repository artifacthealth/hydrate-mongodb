var Reference = require("./reference");
var Observer = (function () {
    /**
     * Creates an Observer object.
     * @param callback Called the first time any of the watched objects change.
     */
    function Observer(callback) {
        this._watching = [];
        this._onChange = this._createOnChangeEvent(callback);
    }
    Observer.prototype.watch = function (obj) {
        if (!this._watching)
            throw new Error("Observer is destroyed.");
        Object.observe(obj, this._onChange);
        this._watching.push(obj);
    };
    Observer.prototype.destroy = function () {
        if (!this._watching)
            return;
        for (var i = 0; i < this._watching.length; i++) {
            Object.unobserve(this._watching[i], this._onChange);
        }
        this._watching = undefined;
    };
    Observer.prototype._createOnChangeEvent = function (callback) {
        var _this = this;
        return function (changes) {
            for (var i = 0; i < changes.length; i++) {
                var change = changes[i];
                if (change.type != 'update' || !Reference.areEqual(change.oldValue, change.object[change.name])) {
                    // value has changed
                    callback();
                    _this.destroy();
                    return;
                }
            }
        };
    };
    return Observer;
})();
module.exports = Observer;
