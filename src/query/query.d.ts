import {ResultCallback} from "../core/resultCallback";

export interface Query<T> {

    execute(callback: ResultCallback<T>): void;
}
