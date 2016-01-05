import {Constructor} from "./core/constructor";
import {SessionFactory} from "./sessionFactory";
import {Persister} from "./persister";
import {EntityMapping} from "./mapping/entityMapping";
import {InternalSession} from "./internalSession";
import {ResultCallback} from "./core/resultCallback";

export interface InternalSessionFactory extends SessionFactory {

    getMappingForObject(obj: any, callback: ResultCallback<EntityMapping>): void;
    getMappingForConstructor(ctr: Constructor<any>, callback: ResultCallback<EntityMapping>): void;
    createPersister(session: InternalSession, mapping: EntityMapping, callback: ResultCallback<Persister>): void;
}
