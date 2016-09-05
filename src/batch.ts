import * as async from "async";
import {Table} from "./core/table";
import {Callback} from "./core/callback";
import {Command} from "./core/command";
import {PersistenceError} from "./persistenceError";
import {FlushPriority} from "./mapping/mappingModel";

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

        // make sure command has a priority
        if (command.priority == null) {
            command.priority = FlushPriority.Medium;
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

        var self = this;

        // sort the commands in priority order
        this._commands.sort(commandSorter);
        executeCommands();

        function executeCommands(err?: Error): void {

            // if we got an error or there are no commands left then call the callback.
            if (err || self._commands.length == 0) {
                callback(err);
                return;
            }

            // execute all commands with the same priority in parallel
            var priority = self._commands[0].priority,
                count = 0;

            // count the number of commands that have the same priority
            while(count < self._commands.length && self._commands[count].priority == priority) {
                count++;
            }

            async.each(
                self._commands.splice(0, count),
                (command: Command, done: (err?: Error) => void) => command.execute(done),
                executeCommands);
        }
    }
}

function commandSorter(a: Command, b: Command): number {

    // higher priority commands come first
    return b.priority - a.priority;
}