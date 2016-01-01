import {ResultCallback} from "../core/resultCallback";
import {Query} from "./query";

export interface FindOneQuery<T> extends Query<T> {

    fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
}
