var MappingError;
(function (MappingError) {
    function createErrorMessage(errors) {
        var message = [];
        for (var i = 0, l = errors.length; i < l; i++) {
            if (i > 0) {
                message.push("\n");
            }
            var error = errors[i];
            if (error.path) {
                message.push(error.path, ": ");
            }
            message.push(error.message);
        }
        return message.join("");
    }
    MappingError.createErrorMessage = createErrorMessage;
})(MappingError || (MappingError = {}));
module.exports = MappingError;
