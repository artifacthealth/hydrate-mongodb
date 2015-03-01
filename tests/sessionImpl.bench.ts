/// <reference path="../typings/baseline.d.ts" />

import Session = require("../src/session");
import Configuration = require("../src/config/configuration");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import SessionFactory = require("../src/sessionFactory");
import Cat = require("./fixtures/cat");
import helpers = require("./helpers");
import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import Persister = require("../src/persister");
import ChangeTracking = require("../src/mapping/changeTracking");
import IdentityGenerator = require("../src/id/identityGenerator");
import Batch = require("../src/batch");
import Result = require("../src/core/result");
import PropertyFlags = require("../src/mapping/propertyFlags");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import ResultCallback = require("../src/core/resultCallback");
import EntityMapping = require("../src/mapping/entityMapping");
import QueryDefinition = require("../src/query/queryDefinition");
import InternalSession = require("../src/internalSession");

suite("SessionImpl", () => {

    var session: Session;
    var count = 0;
    var cats: Cat[] = [];
    var i = 0;

    before((done) => {
        /*
        var provider = new AnnotationMappingProvider(new Configuration());
        provider.addFile("build/tests/fixtures/cat.d.json");
        provider.getMapping((err, registry) => {
            if (err) return done(err);

            var factory = new DummySessionFactory(registry);
            session = factory.createSession();
            done();
        });
        */
        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/cat.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if (err) return done(err);

            session = sessionFactory.createSession();
            done();
        });
    });

    beforeEach(() => {
        i = 0;
    });

    afterEach(() => {
       // session.flush();
    });

    test("new", () => {
        cats.push(new Cat("cat" + count++));
    });

    test("save", (done) => {
        session.save(cats[i++], done);
        if(i % 1001 == 0) {
            session.flush();
        }
    });

    test("find", (done) => {
        session.query(Cat).findOne({ name: 'cat' + (i++)}, done);
    });

    test("edit", (done) => {
        cats[i].name = 'kitty' + (i++);
        if(i % 1001 == 0) {
            session.flush(done);
        }
        else {
            process.nextTick(done);
        }
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

    changeTracking: ChangeTracking;
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