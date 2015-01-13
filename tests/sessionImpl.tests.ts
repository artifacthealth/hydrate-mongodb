/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import Configuration = require("../src/config/configuration");
import SessionFactory = require("../src/sessionFactory");
import SessionImpl = require("../src/sessionImpl");
import model = require("./fixtures/model");
import MockSessionFactory = require("./mockSessionFactory");

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

});
