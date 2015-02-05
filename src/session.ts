import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Constructor = require("./core/constructor");
import LockMode = require("./lockMode");
import Query = require("./query/query");
import FindOneBuilder = require("./query/findOneBuilder")

interface Session {

    save(obj: any, callback?: Callback): void;
    remove(obj: any, callback?: Callback): void;
    detach(obj: any, callback?: Callback): void;
    refresh(obj: any, callback: Callback): void;
    merge(obj: any, callback: ResultCallback<any>): void;
    flush(callback?: Callback): void;
    clear(callback?: Callback): void;
    contains(obj: any): boolean;
    getId(obj: any): any;
    getReference<T>(ctr: Constructor<T>, id: any): T;
    find<T>(ctr: Constructor<T>, id: any, callback?: ResultCallback<T>): FindOneBuilder<T>;
    fetch<T>(obj: T, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, path: string, callback?: ResultCallback<T>): void;
    fetch<T>(obj: T, paths: string[], callback?: ResultCallback<T>): void;
    query<T>(ctr: Constructor<T>): Query<T>;
}

export = Session;