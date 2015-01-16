import Session = require("./session");
import ResultCallback = require("./core/resultCallback");
import Identifier = require("./id/identifier");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");
import InternalSessionFactory = require("./internalSessionFactory");

interface InternalSession extends Session {

    factory: InternalSessionFactory;

    getObject(id: Identifier): any;
    registerManaged(persister: Persister, entity: any, document: any): void;
    getPersister(mapping: EntityMapping): Persister;
    getReferenceInternal(mapping: EntityMapping, id: Identifier): any;
}

export = InternalSession;