import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Constructor = require("./core/constructor");
import LockMode = require("./lockMode");

interface Session {

    save(obj: any, callback?: Callback): void;
    remove(obj: any, callback?: Callback): void;
    detach(obj: any, callback?: Callback): void;
    refresh(obj: any, callback: Callback): void;
    flush(callback?: Callback): void;
    clear(callback?: Callback): void;
    contains(obj: any): boolean;
    getId(obj: any): any;
    getReference<T>(ctr: Constructor<T>, id: any): T;
    find<T>(ctr: Constructor<T>, id: any, callback: ResultCallback<T>): void;
    fetch<T>(obj: T, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, path: string | string[], callback?: ResultCallback<T>): void;
}

export = Session;