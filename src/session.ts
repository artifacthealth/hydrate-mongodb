import Callback = require("./core/callback");
import Constructor = require("./core/constructor");
import Identifier = require("./id/identifier");
import LockMode = require("./lockMode");
import ResultCallback = require("./core/resultCallback");
import Query = require("./query");

interface Session {

    save(obj: any, callback?: Callback): void;
    remove(obj: any, callback?: Callback): void;
    detach(obj: any, callback?: Callback): void;
    refresh(obj: any, callback: Callback): void;
    flush(callback?: Callback): void;
    clear(callback?: Callback): void;
    contains(obj: any): boolean;
    getId(obj: any): Identifier;
    find<T>(ctr: Constructor<T>, id: Identifier, callback: ResultCallback<T>): void;
    query<T>(ctr: Constructor<T>): Query<T>;
}

export = Session;