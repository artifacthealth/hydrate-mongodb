import Callback = require("./callback");

interface Command {

    execute(callback: Callback): void;
}

export = Command;