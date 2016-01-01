import {Callback} from "./callback";

export interface Command {

    execute(callback: Callback): void;
}
