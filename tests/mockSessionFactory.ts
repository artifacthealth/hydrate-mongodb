import {SessionFactoryImpl} from "../src/sessionFactoryImpl";
import {InternalSession} from "../src/internalSession";
import {Persister} from "../src/persister";
import {EntityMapping} from "../src/mapping/entityMapping";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {MockPersister} from "./mockPersister";
import {Constructor} from "../src/core/constructor";
import {ResultCallback} from "../src/core/resultCallback";
import {MockDb} from "./driver/mockDb";

export class MockSessionFactory extends SessionFactoryImpl {

    constructor(mappingRegistry: MappingRegistry) {
        super(new MockDb("test"), mappingRegistry);
    }

    createPersister(session: InternalSession, mapping: EntityMapping, callback: ResultCallback<Persister>): void {

        process.nextTick(() => callback(null, new MockPersister(mapping)));
    }

    createSession(): InternalSession {

        return <InternalSession>super.createSession();
    }

    getPersisterForObject(session: InternalSession, obj: any, callback: ResultCallback<MockPersister>): void {

        this.getMappingForObject(obj, (err, mapping) => {
            if(err) return callback(err);

            session.getPersister(mapping, callback);
        });

    }

    getPersisterForConstructor(session: InternalSession, ctr: Constructor<any>, callback: ResultCallback<MockPersister>): void {

        this.getMappingForConstructor(ctr, (err, mapping) => {
            if(err) return callback(err);

            session.getPersister(mapping, callback);
        });
    }
}
