import Callback = require("./callback");
import Constructor = require("./constructor");
import Identifier = require("./id/identifier");
import LockMode = require("./lockMode");
import ResultCallback = require("./resultCallback");

interface Session {

    persist(obj: any, callback: Callback): void;
    remove(obj: any): void;
    detach(obj: any): void;
    flush(callback: Callback): void;
    find<T>(ctr: Constructor<T>, id: Identifier, callback: ResultCallback<T>): void;
}

export = Session;