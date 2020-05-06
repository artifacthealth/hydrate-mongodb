import * as mongodb from "mongodb";
import { InternalSession, Session } from "../src/session";
import { Configuration } from "../src/config/configuration";
import { AnnotationMappingProvider } from "../src/mapping/providers/annotationMappingProvider";
import { Cat } from "../tests/fixtures/cat";
import { SessionFactory, SessionFactoryImpl } from "../src/sessionFactory";
import {DirtyCheckContext, Persister} from "../src/persister";
import { IdentityGenerator } from "../src/config/configuration";
import { Batch } from "../src/batch";
import { MappingModel, ChangeTrackingType } from "../src/mapping/mappingModel";
import { MappingRegistry } from "../src/mapping/mappingRegistry";
import {ResultCallback, Callback} from "../src/core/callback";
import { EntityMapping } from "../src/mapping/entityMapping";
import { QueryDefinition } from "../src/query/queryDefinition";
import { Observer } from "../src/observer";
import {Property} from "../src/mapping/property";
import {MockMongoClient} from "../tests/driver/mockMongoClient";

suite("SessionImpl", () => {

    var session: Session;
    var count = 0;
    var cats: Cat[] = [];
    var i = 0, saved = 0;

    before((done) => {

        /*
        var provider = new AnnotationMappingProvider(new Configuration());
        provider.addFile("build/tests/fixtures/cat.js");
        provider.getMapping((err, registry) => {
            if (err) return done(err);

            var factory = new DummySessionFactory(registry);
            session = factory.createSession();
            done();
        });
        */

        var config = new Configuration();
        config.createIndexes = true;
        config.addMapping(new AnnotationMappingProvider(Cat));

        mongodb.MongoClient.connect("mongodb://localhost:27017", (err, connection) => {
            if(err) return done(err);

            config.createSessionFactory(connection, "test", (err: Error, sessionFactory: SessionFactory) => {
                if (err) return done(err);

                session = sessionFactory.createSession();
                session.query(Cat).removeAll({}, done);
            });
        });

        // setup test data
        for(var i = 0; i < 1000000; i++) {
            cats.push(new Cat("cat" + count++));
        }
    });

    after((done) => {

        for(var j = 0; j < saved; j++) {
            session.remove(cats[j]);
        }

        session.flush(done);
    });

    beforeEach(() => {
        i = 0;
    });

    test("save x 1000", (done) => {
        for(var j = 0; j < 1000; j++) {
            if(!cats[i]) return done(new Error("ran out of cats at " + i));
            session.save(cats[i++]);
            saved = i;
        }
        session.flush(done);
    });

    test("findOne", (done) => {
        session.query(Cat).findOne({ name: 'cat' + (i++)}, done);
    });

    test("findAll", (done) => {
        session.query(Cat).findAll({ name: /^cat/}, done);
    });

    test("edit x 1000", (done) => {

        for(var j = 0; j < 1000; j++) {
            if(!cats[i]) return done(new Error("ran out of cats at " + i));
            cats[i].name = 'kitty' + (i++);
        }
        session.flush(done);
    });
});



class DummySessionFactory extends SessionFactoryImpl {

    constructor(mappingRegistry: MappingRegistry) {
        super(new MockMongoClient(), null, mappingRegistry);
    }

    createPersister(session: InternalSession, mapping: EntityMapping): Persister {

        return new DummyPersister(mapping);
    }
}

class DummyPersister implements Persister {

    changeTracking: ChangeTrackingType;
    identity: IdentityGenerator;

    constructor(mapping: EntityMapping) {
        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;
    }

    areDocumentsEqual(context: DirtyCheckContext, entity: Object, originalDocument: Object): boolean {
        return true;
    }

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Object {

        return originalDocument;
    }

    addInsert(batch: Batch, entity: any): Object {

        return {};
    }

    addRemove(batch: Batch, entity: any): void {

    }

    postUpdate(entity: Object, callback: Callback): void {

        callback();
    }

    postInsert(entity: Object, callback: Callback): void {

        callback();
    }

    postRemove(entity: Object, callback: Callback): void {

        callback();
    }

    refresh(entity: any, callback: ResultCallback<any>): void {
    }

    watch(value: any, observer: Observer): void {
    }

    fetch(entity: any, path: string, callback: Callback): void {
    }

    fetchPropertyValue(entity: any, property: Property, callback: ResultCallback<any>): void {
    }

    findAll(criteria: any, callback?: ResultCallback<any[]>): void {
    }

    findOneById(id: any, callback: ResultCallback<any>): void {
    }

    findOne(criteria: any, callback: ResultCallback<any>): void {

    }

    findInverseOf(entity: Object, path: string, callback: ResultCallback<any[]>): void {

    }

    findOneInverseOf(entity: Object, path: string, callback: ResultCallback<any>): void {

    }

    walk(entity: any, flags: MappingModel.PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<Object>): void {
    }
}
