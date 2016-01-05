/// <reference path="../typings/node.d.ts" />

import {EventEmitter} from "events";
import {Callback} from "./core/callback";
import {ResultCallback} from "./core/resultCallback";
import {Constructor} from "./core/constructor";
import {QueryBuilder} from "./query/queryBuilder";
import {FindOneQuery} from "./query/findOneQuery"

export interface Session extends EventEmitter {

    save(obj: Object, callback?: Callback): void;
    remove(obj: Object, callback?: Callback): void;
    detach(obj: Object, callback?: Callback): void;
    refresh(obj: Object, callback: Callback): void;
    flush(callback?: Callback): void;
    clear(callback?: Callback): void;
    find<T>(ctr: Constructor<T>, id: any, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch<T>(obj: T, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, path: string, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, paths: string[], callback?: ResultCallback<T>): void;
    query<T>(ctr: Constructor<T>): QueryBuilder<T>;
    wait(callback?: Callback): void;
    close(callback?: Callback): void;
    contains(obj: Object): boolean;
    getId(obj: Object): any;
    getReference<T>(ctr: Constructor<T>, id: any): T;
}
