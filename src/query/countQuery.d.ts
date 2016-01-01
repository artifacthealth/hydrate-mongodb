import {ResultCallback} from "../core/resultCallback";
import {Query} from "./query";

export interface CountQuery extends Query<number> {

    limit(value: number, callback?: ResultCallback<number>): CountQuery;
    skip(value: number, callback?: ResultCallback<number>): CountQuery;
}
