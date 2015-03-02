/// <reference path="../typings/node.d.ts" />
import events = require("events");

import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Constructor = require("./core/constructor");
import LockMode = require("./lockMode");
import Query = require("./query/query");
import FindOneQuery = require("./query/findOneQuery")

interface Session extends events.EventEmitter {

    save(obj: Object, callback?: Callback): void;
    remove(obj: Object, callback?: Callback): void;
    detach(obj: Object, callback?: Callback): void;
    refresh(obj: Object, callback: Callback): void;
    flush(callback?: Callback): void;
    clear(callback?: Callback): void;
    contains(obj: Object): boolean;
    getId(obj: Object): any;
    getReference<T>(ctr: Constructor<T>, id: any): T;
    find<T>(ctr: Constructor<T>, id: any, callback?: ResultCallback<T>): FindOneQuery<T>;
    fetch<T>(obj: T, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, path: string, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, paths: string[], callback?: ResultCallback<T>): void;
    query<T>(ctr: Constructor<T>): Query<T>;
    wait(callback?: Callback): void;
    close(callback?: Callback): void;
}

export = Session;