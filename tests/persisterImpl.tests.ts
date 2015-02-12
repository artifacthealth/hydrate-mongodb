/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import util = require("util");

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import model = require("./fixtures/model");
import helpers = require("./helpers");

import MockCollection = require("./driver/mockCollection");
import MockSessionFactory = require("./mockSessionFactory");
import QueryDefinitionStub = require("./query/queryDefinitionStub");
import QueryKind = require("../src/query/queryKind");

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

            var person = helpers.createPerson();
            var id =  (<any>person)._id;

            var collection = new MockCollection();
            collection.onFind = (criteria) => {
                assert.deepEqual(criteria, { parents: id });
                done();
                return collection.createCursor();
            }

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findInverseOf(person, "parents", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("returns an error if specified path does not represent a property in the mapping", (done) => {

            helpers.createPersister(new MockCollection(), (err, persister) => {
                if (err) return done(err);

                var person = helpers.createPerson();

                persister.findInverseOf(person, "blah", (err, results) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe('findOneInverseOf', () => {

        it("finds the first entity in the collection where the property specified by path has a value matching id", (done) => {

            var person = helpers.createPerson();
            var id =  (<any>person)._id;

            var collection = new MockCollection();
            collection.onFindOne = (criteria, callback) => {
                assert.deepEqual(criteria, { parents: id });
                callback(null, { _id: id });
                done();
            }

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findOneInverseOf(person, "parents", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("returns an error if specified path does not represent a property in the mapping", (done) => {

            helpers.createPersister(new MockCollection(), (err, persister) => {
                if (err) return done(err);

                var person = helpers.createPerson();

                persister.findOneInverseOf(person, "blah", (err, results) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe('findOneById', () => {

        it('calls the callbacks of all invocations when called multiples times for the same identifier', (done) => {

            var id = helpers.generateId();
            var collection = new MockCollection([ { _id: id }]);

            helpers.createPersister(collection, (err, persister) => {
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

        describe('distinct', () => {

            it('returns an error if the values returned from the collection are not of the type expected', (done) => {

                var collection = new MockCollection();
                collection.onDistinct = (key, criteria, options, callback) => {

                    callback(null, [ 1, 2, 3 ])
                }

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.Distinct);
                    query.key = "personName.last";
                    query.criteria = {};

                    persister.executeQuery(query, (err, results) => {
                        // TODO: check error code
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it('allows for dot notation in key', (done) => {

                var collection = new MockCollection();
                collection.onDistinct = (key, criteria, options, callback) => {
                    callback(null, [ "bob", "joe", "mary" ])
                }

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.Distinct);
                    query.key = "personName.last";
                    query.criteria = {};

                    persister.executeQuery(query, (err, results) => {
                        if(err) return done(err);
                        assert.deepEqual(results, [ "bob", "joe", "mary" ])
                        done();
                    });
                });
            });

            it('deserializes returned embedded objects', (done) => {

                var collection = new MockCollection();
                collection.onDistinct = (key, criteria, options, callback) => {
                    callback(null, [ { last: "Jones", first: "Mary" } ])
                }

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.Distinct);
                    query.key = "personName";
                    query.criteria = {};

                    persister.executeQuery(query, (err: Error, results: any[]) => {
                        if(err) return done(err);
                        assert.instanceOf(results[0], model.PersonName);
                        done();
                    });
                });
            });

            it('translates property names to field names in key', (done) => {
                var collection = new MockCollection();
                collection.onDistinct = (key, criteria, options, callback) => {
                    assert.equal(key, "name");
                    done();
                }

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.Distinct);
                    query.key = "_name";
                    query.criteria = {};

                    persister.executeQuery(query, (err, results) => {
                        if(err) return done(err);
                    });
                });
            });
        });
    });
});

