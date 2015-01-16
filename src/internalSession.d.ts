import Session = require("./session");
import ResultCallback = require("./core/resultCallback");
import Identifier = require("./id/identifier");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");

interface InternalSession extends Session {

    getObject(id: Identifier): any;
    registerManaged(persister: Persister, entity: any, document: any): void;
    getPersister(mapping: EntityMapping): Persister;
}

export = InternalSession;