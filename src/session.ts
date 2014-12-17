import Callback = require("./callback");
import Constructor = require("./constructor");
import Identifier = require("./id/identifier");
import LockMode = require("./lockMode");
import ResultCallback = require("./resultCallback");

interface Session {

    save(obj: any, callback: Callback): void;
    remove(obj: any, callback: Callback): void;
    detach(obj: any, callback: Callback): void;
    flush(callback: Callback): void;
    clear(): void;
    getIdentifier(obj: any): Identifier;
    find<T>(ctr: Constructor<T>, id: Identifier, callback: ResultCallback<T>): void;
}

export = Session;