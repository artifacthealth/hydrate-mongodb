/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import model = require("./fixtures/model");
import helpers = require("./helpers");

import PersisterImpl = require("../src/persisterImpl");
import MockCollection = require("./driver/mockCollection");
import ObjectIdGenerator = require("../src/id/objectIdGenerator");
import MockSessionFactory = require("./mockSessionFactory");


describe('PersisterImpl', () => {

    describe('dirtyCheck', () => {
    });

    describe('addInsert', () => {
    });

    describe('addRemove', () => {
    });

    describe('refresh', () => {
    });

    describe('resolve', () => {
    });

    describe('findInverseOf', () => {

        it("finds all entities in the collection where the property specified by path has a value matching id", (done) => {

            var id = generateId();
            var collection = new MockCollection();
            collection.onFind = (criteria) => {
                assert.deepEqual(criteria, { __t: "Person", parents: id });
                done();
                return collection.createCursor();
            }

            createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findInverseOf(id, "parents", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("does not include the discriminator in the criteria if the mapping is not part of an inheritance hierarchy", (done) => {

            var id = generateId();
            var collection = new MockCollection();
            collection.onFind = (criteria) => {
                assert.deepEqual(criteria, { person: id });
                done();
                return collection.createCursor();
            }

            createPersister(collection, model.User, (err, persister) => {
                if (err) return done(err);

                persister.findInverseOf(id, "person", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("returns an error if specified path does not represent a property in the mapping", (done) => {

            createPersister(new MockCollection(), (err, persister) => {
                if (err) return done(err);

                persister.findInverseOf(1, "blah", (err, results) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe('findOneInverseOf', () => {

        it("finds the first entity in the collection where the property specified by path has a value matching id", (done) => {

            var id = generateId();
            var collection = new MockCollection();
            collection.onFindOne = (criteria, callback) => {
                assert.deepEqual(criteria, { __t: "Person", parents: id });
                callback(null, { _id: id });
                done();
            }

            createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findOneInverseOf(id, "parents", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("does not include the discriminator in the criteria if the mapping is not part of an inheritance hierarchy", (done) => {

            var id = generateId();
            var collection = new MockCollection();
            collection.onFindOne = (criteria, callback) => {
                assert.deepEqual(criteria, { person: id });
                callback(null, { _id: id });
                done();
            }

            createPersister(collection, model.User, (err, persister) => {
                if (err) return done(err);

                persister.findOneInverseOf(id, "person", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("returns an error if specified path does not represent a property in the mapping", (done) => {

            createPersister(new MockCollection(), (err, persister) => {
                if (err) return done(err);

                persister.findOneInverseOf(1, "blah", (err, results) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe('findOneById', () => {

        it('calls the callbacks of all invocations when called multiples times for the same identifier', (done) => {

            var id = generateId();
            var collection = new MockCollection([ { _id: id }]);

            createPersister(collection, (err, persister) => {
                if (err) return done(err);

                async.each([id, id], (id, done) => persister.findOneById(id, done), done);
            });
        });
    });

    describe('findOne', () => {
    });

    describe('findAll', () => {
    });

    describe('executeQuery', () => {
    });

});

var generator = new ObjectIdGenerator();

function generateId(): any {
    return generator.generate();
}

function createPersister(collection: MockCollection, callback: (err: Error, persister?: PersisterImpl) => void): void;
function createPersister(collection: MockCollection, ctr: Function, callback: (err: Error, persister?: PersisterImpl) => void): void;
function createPersister(collection: MockCollection, ctrOrCallback: any, callback?: (err: Error, persister?: PersisterImpl) => void): void {

    var ctr: any;

    if(arguments.length == 2) {
        callback = ctrOrCallback;
        ctr = model.Person;
    }
    else {
        ctr = ctrOrCallback;
    }

    helpers.createFactory("model", (err, factory) => {
        if (err) return callback(err);
        callback(null, new PersisterImpl(factory.createSession(), factory.getMappingForConstructor(ctr), collection));
    });
}
