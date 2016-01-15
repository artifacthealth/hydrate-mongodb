/// <reference path="../typings/baseline.d.ts" />
/// <reference path="../typings/mongodb.d.ts" />

import * as mongodb from "mongodb";

import { Session } from "../src/session";
import { Configuration } from "../src/config/configuration";
import { AnnotationMappingProvider } from "../src/mapping/providers/annotationMappingProvider";
import { SessionFactory } from "../src/sessionFactory";
import { Cat } from "../tests/fixtures/cat";
import * as helpers from "../tests/helpers";
import { SessionFactoryImpl } from "../src/sessionFactoryImpl";
import { Persister } from "../src/persister";
import { ChangeTrackingType } from "../src/mapping/changeTrackingType";
import { IdentityGenerator } from "../src/id/identityGenerator";
import { Batch } from "../src/batch";
import { Result } from "../src/core/result";
import { PropertyFlags } from "../src/mapping/propertyFlags";
import { MappingRegistry } from "../src/mapping/mappingRegistry";
import { ResultCallback } from "../src/core/resultCallback";
import { EntityMapping } from "../src/mapping/entityMapping";
import { QueryDefinition } from "../src/query/queryDefinition";
import { InternalSession } from "../src/internalSession";
import { Observer } from "../src/observer";

suite("SessionImpl", () => {

    var session: Session;
    var count = 0;
    var cats: Cat[] = [];
    var i = 0;

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
        config.addMapping(new AnnotationMappingProvider(Cat));

        mongodb.MongoClient.connect("mongodb://localhost:27017/artifact", (err, connection) => {

            config.createSessionFactory(connection, (err: Error, sessionFactory: SessionFactory) => {
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

    beforeEach(() => {
        i = 0;
    });

    test("save x 1000", (done) => {
        for(var j = 0; j < 1000; j++) {
            if(!cats[i]) return done(new Error("ran out of cats at " + i));
            session.save(cats[i++]);
        }
        session.flush(done);
    });

    test("find", (done) => {
        session.query(Cat).findOne({ name: 'cat' + (i++)}, done);
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
        super(null, mappingRegistry);
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

    dirtyCheck(batch: Batch, entity: any, originalDocument: any): Result<any> {
        return new Result(null, originalDocument);
    }

    addInsert(batch: Batch, entity: any): Result<any> {
        return new Result(null, {});
    }

    addRemove(batch: Batch, entity: any): void {
    }

    refresh(entity: any, callback: ResultCallback<any>): void {
    }

    watch(value: any, observer: Observer): void {
    }

    fetch(entity: any, path: string, callback: Callback): void {
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

    walk(entity: any, flags: PropertyFlags,  entities: any[], embedded: any[], callback: Callback): void {
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<Object>): void {
    }
}

suite("for-of", function() {

    var n = 100000;
    var list = new Array(n);
    for(var i = 0; i < n; i++) {
        list[i] = i;
    }

    test("for", function() {

        var x = 0;
        for(var i = 0; i < n; i++) {
            x += list[i];
        }
        if(x != 4999950000) throw new Error('wrong count');
    });

    test("for-of", function() {

        var x = 0;
        for(var i of list) {
            x += i;
        }
        if(x != 4999950000) throw new Error('wrong count');
    });

});
