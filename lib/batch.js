var async = require("async");
var Batch = (function () {
    function Batch() {
        this._commandTable = [];
        this._commands = [];
        this._executed = false;
    }
    /**
     * Gets a command from the batch.
     * @param id The id of the command.
     * @returns The command or undefined if the id cannot be found.
     */
    Batch.prototype.getCommand = function (id) {
        return this._commandTable[id];
    };
    /**
     * Adds a command to the batch.
     * @param id Number that uniquely identifies the command.
     * @param command The command to add.
     */
    Batch.prototype.addCommand = function (id, command) {
        if (this._commandTable[id]) {
            throw new Error("Batch already contains a command with id '" + id + "'.");
        }
        this._commandTable[id] = command;
        this._commands.push(command);
    };
    /**
     * Executes the batch.
     * @param callback Callback called when execution completes.
     */
    Batch.prototype.execute = function (callback) {
        if (this._executed) {
            throw new Error("Batch had already been executed.");
        }
        this._executed = true;
        if (this._commands.length == 0) {
            return process.nextTick(function () { return callback(); });
        }
        async.each(this._commands, function (command, done) { return command.execute(done); }, callback);
    };
    return Batch;
})();
module.exports = Batch;
