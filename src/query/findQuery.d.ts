import {ResultCallback} from "../core/resultCallback";
import {Callback} from "../core/callback";
import {IteratorCallback} from "../core/iteratorCallback";
import {Query} from "./query";

export interface FindQuery<T> extends Query<T[]> {

    sort(field: string, direction: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    sort(fields: [string, number][], callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(path: string, callback?: ResultCallback<T[]>): FindQuery<T>;
    fetch(paths: string[], callback?: ResultCallback<T[]>): FindQuery<T>;
    limit(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    skip(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
    batchSize(value: number): FindQuery<T>;
    each(iterator: IteratorCallback<T>, callback: Callback): void;
    eachSeries(iterator: IteratorCallback<T>, callback: Callback): void;
}
