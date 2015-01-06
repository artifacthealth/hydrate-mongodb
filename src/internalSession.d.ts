import Session = require("./session");
import Collection = require("./driver/collection");
import ResultCallback = require("./core/resultCallback");
import Identifier = require("./id/identifier");
import Persister = require("./entityPersister");

interface InternalSession extends Session {

    getObject(id: Identifier): any;
    registerManaged(persister: Persister, entity: any, document: any): void;
}

export = InternalSession;