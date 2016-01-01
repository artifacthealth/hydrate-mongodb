/// <reference path="../typings/baseline.d.ts" />
/// <reference path="../typings/mongodb.d.ts" />

import mongodb = require("mongodb");

import Session = require("../src/session");
import Configuration = require("../src/config/configuration");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import SessionFactory = require("../src/sessionFactory");
import Cat = require("../tests/fixtures/cat");
import helpers = require("../tests/helpers");
import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import Persister = require("../src/persister");
import ChangeTrackingType = require("../src/mapping/changeTrackingType");
import IdentityGenerator = require("../src/id/identityGenerator");
import Batch = require("../src/batch");
import Result = require("../src/core/result");
import PropertyFlags = require("../src/mapping/propertyFlags");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import ResultCallback = require("../src/core/resultCallback");
import EntityMapping = require("../src/mapping/entityMapping");
import QueryDefinition = require("../src/query/queryDefinition");
import InternalSession = require("../src/internalSession");
import Observer = require("../src/observer");

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

        var mapping = new AnnotationMappingProvider();
        mapping.addFile("build/tests/fixtures/cat.js");

        var config = new Configuration();
        config.addMapping(mapping);

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
