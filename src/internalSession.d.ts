import {Session} from "./session";
import {Callback} from "./core/callback";
import {ResultCallback} from "./core/resultCallback";
import {Persister} from "./persister";
import {EntityMapping} from "./mapping/entityMapping";
import {InternalSessionFactory} from "./internalSessionFactory";
import {QueryDefinition} from "./query/queryDefinition";

export interface InternalSession extends Session {

    factory: InternalSessionFactory;

    getObject(id: any): any;
    registerManaged(persister: Persister, entity: Object, document: any): void;
    notifyRemoved(entity: Object): void;
    getPersister(mapping: EntityMapping, callback: ResultCallback<Persister>): void;
    getReferenceInternal(mapping: EntityMapping, id: any): any;
    fetchInternal(entity: Object, paths: string[], callback: ResultCallback<any>): void;
    executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void;
}
