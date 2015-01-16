/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

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

describe('SessionImpl', () => {

    describe('save', () => {

        it('generates an identifier for the object', (done) => {
            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);
            var entity: any = {};

            session.save(entity, (err) => {
                if(err) return done(err);

                assert.equal(entity["_id"], 1, "Entity was not assigned an identifier");
                done();
            });
        });

        it('returns an error if a persister cannot be found for the object', (done) => {
            var factory = new MockSessionFactory();
            factory.persister = undefined;
            var session = new SessionImpl(factory);

            session.save({}, (err) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                done();
            });
        });

        it('returns an error if the object is a detached entity', (done) => {
            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);

            session.save({ _id: 1 }, (err) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                done();
            });
        });

        it('schedules newly managed objects for insert', (done) => {
            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);
            var entity: any = {};

            session.save(entity);
            session.flush((err) => {
                if(err) return done(err);

                assert.equal(factory.persister.insertCalled, 1);
                assert.isTrue(factory.persister.wasInserted(entity));
                done();
            });
        });

        it('cancels pending removal for saved entity', (done) => {
            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);
            var entity: any = {};

            session.save(entity);
            // Flush after save because if we call remove after save without a flush, it cancels the save operations
            // and never schedules a remove operation to begin with.
            session.flush();
            session.remove(entity, (err) => {
                if(err) return done(err);

                // Confirm that entity has been removed. GetObject returns null (as opposed to undefined) if object
                // is managed but scheduled for removal.
                assert.isNull(session.getObject(1), "Object is not scheduled for remove");

                session.save(entity, (err) => {
                    if(err) return done(err);

                    assert.equal(session.getObject(1), entity, "Scheduled remove operation was not cancelled");

                    session.flush((err) => {
                        if(err) return done(err);

                        assert.equal(factory.persister.removeCalled, 0);
                        assert.equal(factory.persister.insertCalled, 1);
                    });
                    done();
                });
            });
        });
    });

    describe('remove', () => {

        it('cancels pending insert for newly manged objects', (done) => {

            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);
            var entity: any = {};

            session.save(entity);
            session.remove(entity, err => {

                assert.isUndefined(entity["_id"], "Identifier was not removed from the object");

                session.flush(err => {
                    if(err) return done(err);

                    assert.equal(factory.persister.removeCalled, 0, "Remove should not have been called because object was never persister");
                    assert.equal(factory.persister.insertCalled, 0, "Scheduled insert operation was not canceled");
                    done();
                });
            });
        });

        it('schedules persisted object for removal', (done) => {

            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);
            var entity: any = {};

            session.save(entity);
            session.flush();
            session.remove(entity, err => {
                if(err) return done(err);

                assert.isTrue(entity["_id"] !== undefined, "Remove operation should not remove identifier until after flush since entity is persisted");

                session.flush(err => {
                    if(err) return done(err);

                    assert.isUndefined(entity["_id"], "Identifier was not removed from the object after flush");
                    assert.equal(factory.persister.removeCalled, 1);
                    done();
                });
            });
        });

        it('returns an error if the object is a detached entity', (done) => {
            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);

            session.remove({ _id: 1 }, (err) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                done();
            });
        });

        it('does nothing for unmanaged objects', (done) => {

            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);

            // pass unmanaged object to remove
            session.remove({});
            session.flush(err => {
                if(err) return done(err);
                assert.equal(factory.persister.removeCalled, 0);
                done();
            });
        });

        it('does nothing for persisted objects pending removal', (done) => {

            var factory = new MockSessionFactory();
            var session = new SessionImpl(factory);
            var entity: any = {};

            session.save(entity);
            session.flush();
            // call remove twice but it should result it only one call to persister.remove
            session.remove(entity);
            session.remove(entity);
            session.flush(err => {
                if(err) return done(err);
                assert.equal(factory.persister.removeCalled, 1);
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
