/// <reference path="../typings/mongodb.d.ts" />
/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import mongodb = require("mongodb");
import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import Configuration = require("../src/config/configuration");
import SessionFactory = require("../src/sessionFactory");
import SessionFactoryImpl = require("../src/sessionFactoryImpl");
import SessionImpl = require("../src/sessionImpl");
import model = require("./fixtures/model");
import MockSessionFactory = require("./mockSessionFactory");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import EntityMapping = require("../src/mapping/entityMapping");
import MockIdentityGenerator = require("./id/mockIdentityGenerator");
import MockPersister = require("./mockPersister");

interface SessionFixture {
    session: SessionImpl;
    persister: MockPersister;
    factory: MockSessionFactory;
}

describe('SessionImpl', () => {

    it('test against mongodb', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if(err) throw err;

            var session = sessionFactory.createSession();

            /*var person = new model.Person(new model.PersonName("Jones", "Bob"));

            person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];

            var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
            person.addParent(parent1);

            var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
            person.addParent(parent2);

            session.save(person);
            session.flush((err) => {
                if(err) return done(err);

                person.birthDate = new Date(1977, 7, 18);

                session.flush(done);
            });*/
                //54b8a19659731ff8ccfc2fe5



            var ids = ["54b8a19659731ff8ccfc2fe7", "54b8a19659731ff8ccfc2fe5"];
            //var ids = ["54b8a19659731ff8ccfc2fe7"];

            /*
            session.find(model.Person, <any>mongodb.ObjectID.createFromHexString("54b8a19659731ff8ccfc2fe5"), (err, entity) => {
                if(err) return done(err);
                console.log(entity);
                done();
            });
            */

            async.each(ids, (id: string, done: (err?: Error) => void) => {
                session.find(model.Person, id, (err, entity) => {
                    if(err) return done(err);

                    session.fetch(entity, ["parents"], (err, result) => {
                        if(err) return done(err);
                        done();
                    });
                });
            }, done);

        });
    });


    describe('save', () => {

        it('generates an identifier for the object', (done) => {
            var fixture = createFixture();
            var entity: any = {};

            fixture.session.save(entity, (err) => {
                if(err) return done(err);

                assert.equal(entity["_id"], 1, "Entity was not assigned an identifier");
                done();
            });
        });

        it('returns an error if a persister cannot be found for the object', (done) => {
            var fixture = createFixture();
            fixture.factory.persister = undefined;
            var session = new SessionImpl(fixture.factory);

            session.save({}, (err) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                done();
            });
        });

        it('returns an error if the object is a detached entity', (done) => {
            var fixture = createFixture();
            fixture.session.save({ _id: 1 }, (err) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                done();
            });
        });

        it('schedules newly managed objects for insert', (done) => {
            var fixture = createFixture();
            var entity: any = {};

            fixture.session.save(entity);
            fixture.session.flush((err) => {
                if(err) return done(err);

                assert.equal(fixture.persister.insertCalled, 1);
                assert.isTrue(fixture.persister.wasInserted(entity));
                done();
            });
        });

        it('cancels pending removal for saved entity', (done) => {
            var fixture = createFixture();
            var entity: any = {};

            fixture.session.save(entity);
            // Flush after save because if we call remove after save without a flush, it cancels the save operations
            // and never schedules a remove operation to begin with.
            fixture.session.flush();
            fixture.session.remove(entity, (err) => {
                if(err) return done(err);

                // Confirm that entity has been removed. GetObject returns null (as opposed to undefined) if object
                // is managed but scheduled for removal.
                assert.isNull(fixture.session.getObject(1), "Object is not scheduled for remove");

                fixture.session.save(entity, (err) => {
                    if(err) return done(err);

                    assert.equal(fixture.session.getObject(1), entity, "Scheduled remove operation was not cancelled");

                    fixture.session.flush((err) => {
                        if(err) return done(err);

                        assert.equal(fixture.persister.removeCalled, 0);
                        assert.equal(fixture.persister.insertCalled, 1);
                    });
                    done();
                });
            });
        });
    });

    describe('remove', () => {

        it('cancels pending insert for newly manged objects', (done) => {

            var fixture = createFixture();
            var entity: any = {};

            fixture.session.save(entity);
            fixture.session.remove(entity, err => {

                assert.isUndefined(entity["_id"], "Identifier was not removed from the object");

                fixture.session.flush(err => {
                    if(err) return done(err);

                    assert.equal(fixture.persister.removeCalled, 0, "Remove should not have been called because object was never persister");
                    assert.equal(fixture.persister.insertCalled, 0, "Scheduled insert operation was not canceled");
                    done();
                });
            });
        });

        it('schedules persisted object for removal', (done) => {

            var fixture = createFixture();
            var entity: any = {};

            fixture.session.save(entity);
            fixture.session.flush();
            fixture.session.remove(entity, err => {
                if(err) return done(err);

                assert.isTrue(entity["_id"] !== undefined, "Remove operation should not remove identifier until after flush since entity is persisted");

                fixture.session.flush(err => {
                    if(err) return done(err);

                    assert.isUndefined(entity["_id"], "Identifier was not removed from the object after flush");
                    assert.equal(fixture.persister.removeCalled, 1);
                    done();
                });
            });
        });

        it('returns an error if the object is a detached entity', (done) => {
            var fixture = createFixture();
            fixture.session.remove({ _id: 1 }, (err) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                done();
            });
        });

        it('does nothing for unmanaged objects', (done) => {

            var fixture = createFixture();

            // pass unmanaged object to remove
            fixture.session.remove({});
            fixture.session.flush(err => {
                if(err) return done(err);
                assert.equal(fixture.persister.removeCalled, 0);
                done();
            });
        });

        it('does nothing for persisted objects pending removal', (done) => {

            var fixture = createFixture();
            var entity: any = {};

            fixture.session.save(entity);
            fixture.session.flush();
            // call remove twice but it should result it only one call to persister.remove
            fixture.session.remove(entity);
            fixture.session.remove(entity);
            fixture.session.flush(err => {
                if(err) return done(err);
                assert.equal(fixture.persister.removeCalled, 1);
                done();
            });
        });
    });

    describe('refresh', () => {

    });

    describe('detach', () => {

    });

    describe('clear', () => {

    });

    describe('flush', () => {

    });

    describe('find', () => {

    });

    describe('getId', () => {

        var session = new SessionImpl(new MockSessionFactory());

        it('returns the identifier of the object', () => {

            var id = "identifier value";
            assert.equal(session.getId({ _id: id }), id);
        });
    });

    describe('contains', () => {

    });

    describe('getObject', () => {

    });

    describe('registerManaged', () => {

    });

    describe('getPersister', () => {

        it('caches the persister for each mapping', () => {
            var registry = new MappingRegistry();
            var mappingA = new EntityMapping(registry);
            var mappingB = new EntityMapping(registry);

            var factory = new SessionFactoryImpl([], registry);
            var session = new SessionImpl(factory);

            // two calls to getPersister for mappingA
            var persisterA1 = session.getPersister(mappingA);
            var persisterA2 = session.getPersister(mappingA);

            // twp calls to getPersister for mappingB
            var persisterB1 = session.getPersister(mappingB);
            var persisterB2 = session.getPersister(mappingB);

            // make sure persisters for same mappings are the same
            assert.equal(persisterA1, persisterA2, "Persisters for same mappings should be the same");
            assert.equal(persisterB1, persisterB2, "Persisters for same mappings should be the same");

            assert.notEqual(persisterA1, persisterB1, "Persisters for different mappings should be different");
        });
    });

});

function createFixture(): SessionFixture {

    var factory = new MockSessionFactory();
    var registry = new MappingRegistry();
    factory.mapping = new EntityMapping(registry);
    factory.mapping.identity = new MockIdentityGenerator();
    factory.mapping.classConstructor = model.Address;
    registry.addMapping(factory.mapping);
    var persister = new MockPersister(factory.mapping);
    factory.persister = persister;
    var session = new SessionImpl(factory);

    return {
        session: session,
        persister: persister,
        factory: factory
    }
}
