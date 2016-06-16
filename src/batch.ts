import * as async from "async";
import {Table} from "./core/table";
import {Callback} from "./core/callback";
import {Command} from "./core/command";
import {PersistenceError} from "./persistenceError";

/**
 * @hidden
 */
export class Batch implements Command {

    private _commandTable: Table<Command> = [];
    private _commands: Command[] = [];
    private _executed = false;

    /**
     * Gets a command from the batch.
     * @param id The id of the command.
     * @returns The command or undefined if the id cannot be found.
     */
    getCommand(id: number): Command {

        return this._commandTable[id];
    }

    /**
     * Adds a command to the batch.
     * @param id Number that uniquely identifies the command.
     * @param command The command to add.
     */
    addCommand(id: number, command: Command): void {

        if(this._commandTable[id]) {
            throw new PersistenceError("Batch already contains a command with id '" + id + "'.");
        }

        this._commandTable[id] = command;
        this._commands.push(command);
    }

    /**
     * Executes the batch.
     * @param callback Callback called when execution completes.
     */
    execute(callback: Callback): void {

        if(this._executed) {
            throw new PersistenceError("Batch had already been executed.");
        }
        this._executed = true;

        if(this._commands.length == 0) {
            return process.nextTick(() => callback());
        }

        async.each(this._commands, (command: Command, done: (err?: Error) => void) => command.execute(done), callback);
    }
}
