import {Callback} from "./callback";

/**
 * @hidden
 */
export interface Command {

    execute(callback: Callback): void;
}
