/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>
/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;
import helpers = require("../helpers");
import QueryDefinition = require("../../src/query/queryDefinition");
import QueryKind = require("../../src/query/queryKind");
import Query = require("../../src/query/query");
import ResultCallback = require("../../src/core/resultCallback");
import Callback = require("../../src/core/callback");
import QueryDocument = require("../../src/query/queryDocument");

// Fixtures
import model = require("../fixtures/model");


describe('Query', () => {

    var queryCriteria: QueryDocument = { _name: 'Bob' };
    var preparedCriteria: QueryDocument = { _name: 'Bob' };
    var emptyPreparedCriteria: QueryDocument = {};

    describe('findAll', () => {

        it('correctly sets the query kind and criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.FindAll);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    done();
                }

                session.query(model.Person).findAll(queryCriteria, (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it('immediately executes query if callback is provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = [ { name: 'Bob' } ];

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<Object[]>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    callback(null, resultToReturn)
                }

                session.query(model.Person).findAll((err, results) => {
                    if(err) return done(err);
                    assert.equal(results, resultToReturn);
                    done();
                });
            });
        });

        it('allows chaining of additional options if callback is not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.limitCount, 10);
                    assert.equal(query.skipCount, 22);
                    assert.equal(query.batchSizeValue, 10000);
                    assert.deepEqual(query.sortBy, [['name', 1]]);
                    assert.deepEqual(query.fetchPaths, [ 'children' ]);
                    done();
                }

                session.query(model.Person).findAll({}).limit(10).skip(22).batchSize(10000).sort([['name', 1]]).fetch("children", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("allows specification of 'each' iterator if callback is not provided", (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var iterator = (item: any, done: Callback) => {};

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.FindEach);
                    assert.equal(query.iterator, iterator);
                    done();
                }

                session.query(model.Person).findAll({}).each(iterator, (err) => {
                    if(err) return done(err);
                });
            });
        });

        it("allows specification of 'eachSeries' iterator if callback is not provided", (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var iterator = (item: any, done: Callback) => {};

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.FindEachSeries);
                    assert.equal(query.iterator, iterator);
                    done();
                }

                session.query(model.Person).findAll({}).eachSeries(iterator, (err) => {
                    if(err) return done(err);
                });
            });
        });

        it('returns error if callback is passed to more than one function in the chain', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                factory.createSession().query(model.Person).findAll({}, (err, results) => { /* first callback */ }).fetch("children", (err, results) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe('findOne', () => {

        it('correctly sets the query kind and criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.FindOne);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    done();
                }

                session.query(model.Person).findOne(queryCriteria, (err, result) => {
                    if(err) return done(err);
                });
            });
        });

        it('immediately executes query if callback is provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = { name: 'Bob' };

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<Object>) => {
                    callback(null, resultToReturn)
                }

                session.query(model.Person).findOne((err, result) => {
                    if(err) return done(err);
                    assert.equal(result, resultToReturn);
                    done();
                });
            });
        });

        it('allows chaining of additional options if callback is not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.deepEqual(query.fetchPaths, [ 'parents' ]);
                    done();
                }

                session.query(model.Person).findOne({ name: 'Test' }).fetch("parents", (err, result) => {
                    if(err) return done(err);
                });
            });
        });

        it('returns error if callback is passed to more than one function in the chain', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                factory.createSession().query(model.Person).findOne({ 'age': 21 }, (err, result) => { /* first callback */ }).fetch("parents", (err, result) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe('findOneAndRemove', () => {

        it('correctly sets the query kind and criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.FindOneAndRemove);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    done();
                }

                session.query(model.Person).findOneAndRemove(queryCriteria, (err, result) => {
                    if(err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = { name: 'bob' };

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<Object>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    callback(null, resultToReturn)
                }

                session.query(model.Person).findOneAndRemove((err, result) => {
                    if(err) return done(err);
                    assert.equal(result, resultToReturn);

                    session.query(model.Person).findOneAndRemove().fetch("parents", (err, result) => {
                        if(err) return done(err);
                        assert.equal(result, resultToReturn);

                        done();
                    });
                });
            });
        });

        it('allows chaining of additional options if callback is not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.deepEqual(query.fetchPaths, [ 'parents' ]);
                    assert.deepEqual(query.sortBy, [['name',1]]);
                    done();
                }

                session.query(model.Person).findOneAndRemove({ name: 'Test' }).sort([['name',1]]).fetch("parents", (err, result) => {
                    if(err) return done(err);
                });
            });
        });

        it('returns error if callback is passed to more than one function in the chain', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                factory.createSession().query(model.Person).findOneAndRemove({ age: 21 }, (err, result) => { /* first callback */ }).fetch("parents", (err, result) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

    });

    describe('findOneAndUpdate', () => {

        it('correctly sets the query kind, criteria, and updateDocument', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var document: QueryDocument = { $set: { age: 42 }};

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.FindOneAndUpdate);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    assert.deepEqual(query.updateDocument, document);
                    assert.isUndefined(query.wantsUpdated);
                    done();
                }

                session.query(model.Person).findOneAndUpdate(queryCriteria, document, (err, result) => {
                    if(err) return done(err);
                });
            });
        });

        it('allows chaining of additional options if callback is not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.deepEqual(query.fetchPaths, [ 'parents' ]);
                    assert.deepEqual(query.sortBy, [['name',1]]);
                    assert.isTrue(query.wantsUpdated);
                    done();
                }

                session.query(model.Person).findOneAndUpdate({ name: 'Test' }, { name: 'Bob' }).sort([['name',1]]).fetch("parents").returnUpdated((err, result) => {
                    if(err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = { name: 'bob' };
                var document: QueryDocument = { $set: { age: 42 }};

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<Object>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    assert.deepEqual(query.updateDocument, document);
                    callback(null, resultToReturn)
                }

                session.query(model.Person).findOneAndUpdate(document, (err, result) => {
                    if(err) return done(err);
                    assert.equal(result, resultToReturn);

                    session.query(model.Person).findOneAndUpdate(document).fetch("parents", (err, result) => {
                        if(err) return done(err);
                        assert.equal(result, resultToReturn);
                        done();
                    });
                });
            });
        });

        it('returns error if callback is passed to more than one function in the chain', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                factory.createSession().query(model.Person).findOneAndUpdate({ age: 21 }, { $set: { arg: 22 }}, (err, result) => { /* first callback */ }).fetch("parents", (err, result) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

    });

    describe('removeAll', () => {

        it('correctly sets the query kind and criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.RemoveAll);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    done();
                }

                session.query(model.Person).removeAll(queryCriteria, (err, count) => {
                    if (err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = 42;

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<number>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    callback(null, resultToReturn)
                }

                session.query(model.Person).removeAll((err, count) => {
                    if(err) return done(err);
                    assert.equal(count, resultToReturn, "The number of items removed was not returned");
                    done();
                });
            });
        });
    });

    describe('removeOne', () => {

        it('correctly sets the query kind and criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.RemoveOne);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    done();
                }

                session.query(model.Person).removeOne(queryCriteria, (err, count) => {
                    if(err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = 1;

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<number>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    callback(null, resultToReturn)
                }

                session.query(model.Person).removeOne((err, count) => {
                    if(err) return done(err);
                    assert.equal(count, resultToReturn, "The number of items removed was not returned");
                    done();
                });
            });
        });
    });

    describe('updateAll', () => {

        it('correctly sets the query kind, criteria, and updateDocument', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var document: QueryDocument = { $set: { age: 42 }};

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.UpdateAll);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    assert.deepEqual(query.updateDocument, document);
                    done();
                }

                session.query(model.Person).updateAll(queryCriteria, document, (err, count) => {
                    if(err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = 1;
                var document: QueryDocument = { $set: { age: 42 }};

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<number>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    assert.deepEqual(query.updateDocument, document);
                    callback(null, resultToReturn)
                }

                session.query(model.Person).updateAll(document, (err, count) => {
                    if(err) return done(err);
                    assert.equal(count, resultToReturn, "The number of items updated was not returned");
                    done();
                });
            });
        });
    });

    describe('updateOne', () => {

        it('correctly sets the query kind, criteria, and updateDocument', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var document: QueryDocument = { $set: { age: 42 }};

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.UpdateOne);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    assert.deepEqual(query.updateDocument, document);
                    done();
                }

                session.query(model.Person).updateOne(queryCriteria, document, (err, count) => {
                    if(err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = 1;
                var document: QueryDocument = { $set: { age: 42 }};

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<number>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    assert.deepEqual(query.updateDocument, document);
                    callback(null, resultToReturn)
                }

                session.query(model.Person).updateOne(document, (err, count) => {
                    if(err) return done(err);
                    assert.equal(count, resultToReturn, "The number of items updated was not returned");
                    done();
                });
            });
        });
    });

    describe('distinct', () => {

        it('correctly sets the query kind, criteria, and key', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var key = 'test';

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.Distinct);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    assert.equal(query.key, key);
                    done();
                }

                session.query(model.Person).distinct(key, queryCriteria, (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it('defaults the criteria to {} if not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = [ 'bob', 'jane' ];
                var key = 'test';

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<any[]>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    assert.equal(query.key, key);
                    callback(null, resultToReturn)
                }

                session.query(model.Person).distinct(key, (err, count) => {
                    if(err) return done(err);
                    assert.equal(count, resultToReturn);
                    done();
                });
            });
        });
    });

    describe('count', () => {

        it('correctly sets the query kind and criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.kind, QueryKind.Count);
                    assert.deepEqual(query.criteria, preparedCriteria);
                    done();
                }

                session.query(model.Person).count(queryCriteria, (err, count) => {
                    if(err) return done(err);
                });
            });
        });

        it('immediately executes query if callback is provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var resultToReturn = 122;

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition, callback: ResultCallback<number>) => {
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    callback(null, resultToReturn)
                }

                session.query(model.Person).count((err, count) => {
                    if(err) return done(err);
                    assert.equal(count, resultToReturn);
                    done();
                });
            });
        });

        it('allows chaining of additional options if callback is not provided', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();

                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onExecuteQuery = (query: QueryDefinition) => {
                    assert.equal(query.limitCount, 10);
                    assert.equal(query.skipCount, 22);
                    assert.deepEqual(query.criteria, emptyPreparedCriteria, "Criteria should default to {} if not provided");
                    done();
                }

                session.query(model.Person).count().limit(10).skip(22, (err, count) => {
                    if(err) return done(err);
                });
            });
        });

        it('returns error if callback is passed to more than one function in the chain', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                factory.createSession().query(model.Person).count({}, (err, count) => { /* first callback */ }).limit(10, (err, count) => {
                    // TODO: check error code
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });
});

