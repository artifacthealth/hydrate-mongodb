var MappingError = require("./mappingError");
var ReadContext = (function () {
    function ReadContext(session) {
        this.session = session;
        /**
         * The current path.
         */
        this.path = "";
        /**
         * A list of errors that occurred during deserialization.
         */
        this.errors = [];
    }
    /**
     * Adds an error to the context.
     * @param message The error message.
     * @param path Optional. The current path if different than what's in the context.
     */
    ReadContext.prototype.addError = function (message, path) {
        this.errors.push({
            message: message,
            path: path || this.path
        });
        this.hasErrors = true;
    };
    /**
     * Gets a string summarizing all errors in the context.
     */
    ReadContext.prototype.getErrorMessage = function () {
        return MappingError.createErrorMessage(this.errors);
    };
    return ReadContext;
})();
module.exports = ReadContext;
