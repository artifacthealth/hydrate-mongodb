import Session = require("./session");
import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Identifier = require("./id/identifier");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");
import InternalSessionFactory = require("./internalSessionFactory");
import QueryDefinition = require("./query/queryDefinition");

interface InternalSession extends Session {

    factory: InternalSessionFactory;

    getObject(id: Identifier): any;
    registerManaged(persister: Persister, entity: any, document: any): void;
    getPersister(mapping: EntityMapping): Persister;
    getReferenceInternal(mapping: EntityMapping, id: Identifier): any;
    fetchInternal(obj: any, paths: string[], callback: ResultCallback<any>): void;
    notifyRemoved(id: Identifier, callback: Callback): void;
    executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void;
}

export = InternalSession;