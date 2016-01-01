import {Constructor} from "./core/constructor";
import {SessionFactory} from "./sessionFactory";
import {Persister} from "./persister";
import {EntityMapping} from "./mapping/entityMapping";
import {InternalSession} from "./internalSession";

export interface InternalSessionFactory extends SessionFactory {

    getMappingForObject(obj: any): EntityMapping;
    getMappingForConstructor(ctr: Constructor<any>): EntityMapping;
    createPersister(session: InternalSession, mapping: EntityMapping): Persister;
}
