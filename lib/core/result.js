// Under Chrome it's faster to allocate an object using new, probably because if it's hidden classes optimization.
/**
 * Class representing an error-first synchronous result analogous to Node's callback pattern.
 */
var Result = (function () {
    function Result(error, value) {
        this.error = error;
        this.value = value;
    }
    Result.prototype.handleCallback = function (callback) {
        var _this = this;
        process.nextTick(function () { return callback(_this.error, _this.value); });
    };
    return Result;
})();
module.exports = Result;
