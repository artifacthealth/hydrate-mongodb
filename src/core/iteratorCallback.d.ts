import {Callback} from "./callback";

export interface IteratorCallback<T> {

    (item: T, callback: Callback): any;
}
