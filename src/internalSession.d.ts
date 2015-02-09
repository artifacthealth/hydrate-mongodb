import Session = require("./session");
import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");
import InternalSessionFactory = require("./internalSessionFactory");
import QueryDefinition = require("./query/queryDefinition");

interface InternalSession extends Session {

    factory: InternalSessionFactory;

    getObject(id: any): any;
    registerManaged(persister: Persister, entity: Object, document: any): void;
    notifyRemoved(entity: Object): void;
    notifyObsolete(entity: Object): void;
    getPersister(mapping: EntityMapping): Persister;
    getReferenceInternal(mapping: EntityMapping, id: any): any;
    fetchInternal(entity: Object, paths: string[], callback: ResultCallback<any>): void;
    executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void;
}

export = InternalSession;