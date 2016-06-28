import {Callback} from "./callback";

/**
 * @hidden
 */
export interface Command {

    priority?: number;

    execute(callback: Callback): void;
}
