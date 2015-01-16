import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Constructor = require("./core/constructor");
import Identifier = require("./id/identifier");
import LockMode = require("./lockMode");

interface Session {

    save(obj: any, callback?: Callback): void;
    remove(obj: any, callback?: Callback): void;
    detach(obj: any, callback?: Callback): void;
    refresh(obj: any, callback: Callback): void;
    flush(callback?: Callback): void;
    clear(callback?: Callback): void;
    contains(obj: any): boolean;
    getId(obj: any): Identifier;
    getReference<T>(ctr: Constructor<T>, id: Identifier): T;
    find<T>(ctr: Constructor<T>, id: Identifier, callback: ResultCallback<T>): void;

    fetch<T>(obj: T, callback: ResultCallback<T>): void;
    fetch<T>(obj: T, path: string, callback: ResultCallback<T>): void;
    fetch<T>(obj: T, paths: string[], callback: ResultCallback<T>): void;
}

export = Session;