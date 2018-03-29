import {assert} from "chai";
import * as async from "async";
import * as helpers from "./helpers";
import * as model from "./fixtures/model";
import {Cursor, ObjectID} from "mongodb";
import {MockCursor} from "./driver/mockCursor";
import {MockCollection} from "./driver/mockCollection";
import {QueryDefinitionStub} from "./query/queryDefinitionStub";
import {QueryKind} from "../src/query/queryKind";
import {Batch} from "../src/batch";
import * as fetchEagerModel from "./fixtures/fetchEager";
import * as fetchLazyModel from "./fixtures/fetchLazy";
import {PersisterImpl} from "../src/persister";
import {createFactory} from "./helpers";
import {MockInternalSession} from "./mockInternalSession";
import {EntityNotFoundError} from "../src/persistenceError";
import {Callback} from "../src/core/callback";
import {User} from "./fixtures/model";

describe('PersisterImpl', () => {

    describe('dirtyCheck', () => {

        it('adds replace operation to batch if document has changed', (done) => {

            runDirtyCheck({
                _id: helpers.generateId()
            }, true, done);
        });

        it('does nothing if document has not changed', (done) => {

            runDirtyCheck({
                name: "Bob",
                _id: helpers.generateId(),
                __t: "Party",
                __v: 1
            }, false, done);
        });

        function runDirtyCheck(originalDocument: any, updated: boolean, done: Callback): void {

            var party = new model.Party("Bob");
            (<any>party)["_id"] = originalDocument._id;
            var collection = new MockCollection();
            var batch = new Batch();

            helpers.createPersister(collection, model.Party, (err, persister) => {
                if (err) return done(err);

                var value = persister.dirtyCheck(batch, party, originalDocument);
                if (batch.error) {
                    return done(batch.error);
                }

                if(!updated) {
                    assert.isUndefined(collection.bulk);
                }
                else {
                    assert.equal(collection.bulk.findDocuments.length, 1);
                    assert.equal(collection.bulk.findDocuments[0]._id, originalDocument._id);
                    assert.equal(collection.bulk.replaceOneDocuments.length, 1);
                    assert.equal(collection.bulk.replaceOneDocuments[0], value);
                }

                done();
            });
        }
    });

    describe('addInsert', () => {

        it('correctly adds type specifier for classes that have derived classes', (done) => {

            var party = new model.Party("Bob");
            (<any>party)["_id"] = helpers.generateId();
            var collection = new MockCollection();
            var batch = new Batch();

            helpers.createPersister(collection, model.Party, (err, persister) => {
                if (err) return done(err);

                var value = persister.addInsert(batch, party);
                if(batch.error) return done(batch.error);

                assert.deepEqual((<any>value).__t, "Party");
                done();
            });
        });
    });

    describe('addRemove', () => {

        it('adds remove operation to batch with correct id', (done) => {

            var party = new model.Party("Bob");
            var id = (<any>party)["_id"] = helpers.generateId();
            var collection = new MockCollection();
            var batch = new Batch();

            helpers.createPersister(collection, model.Party, (err, persister) => {
                if (err) return done(err);

                persister.addRemove(batch, party);

                assert.equal(collection.bulk.findDocuments.length, 1);
                assert.equal(collection.bulk.findDocuments[0]._id, id);
                assert.equal(collection.bulk.removeOneCalled, 1);

                done();
            });
        });
    });

    describe('refresh', () => {
    });

    describe('resolve', () => {
    });

    describe('fetchPropertyValue', () => {

        it("loads the specified field value", (done) => {

            var idA = helpers.generateId();
            var collection = new MockCollection([ { _id: idA, _b: "some large value" }]);

            createFactory("fetchLazy", (err, factory) => {
                if (err) return done(err);

                var session = new MockInternalSession(factory);
                var mapping = factory.getMappingForConstructor(fetchLazyModel.A);
                var persister = new PersisterImpl(session, mapping, collection);

                persister.findOneById(idA, (err, a) => {
                    if (err) return done(err);

                    // clear the value since it's returned from the MockCollection
                    a.b = null;

                    assert.instanceOf(a, fetchLazyModel.A);

                    persister.fetchPropertyValue(a, mapping.getProperty("b"), (err, result) => {
                        if (err) return done(err);

                        assert.equal(result, "some large value");
                        done();
                    });
                });
            });
        });
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
            };

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
            collection.onFindOne = (criteria, fields, callback) => {
                assert.deepEqual(criteria, { parents: id });
                callback(null, { _id: id, __t: "Person" });
                done();
            };

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
            var collection = new MockCollection([ { _id: id, __t: "Person" }]);

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                async.each([id, id], (id, done) => persister.findOneById(id, done), done);
            });
        });

        it('does not consider case for ObjectIds', (done) => {

            var id = helpers.generateId();
            var collection = new MockCollection([ { _id: id, __t: "Person" }]);

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findOneById(id.toString().toUpperCase(), done);
            });
        });

        it("fetches properties flagged as FetchEager", (done) => {

            var idA = helpers.generateId(),
                idC = helpers.generateId();
            var collection = new MockCollection([{ _id: idA, b: { c: idC }}, { _id: idC }]);

            createFactory("fetchEager", (err, factory) => {
                if (err) return done(err);

                var session = new MockInternalSession(factory);
                var persister = new PersisterImpl(session, factory.getMappingForConstructor(fetchEagerModel.A), collection);

                persister.findOneById(idA, (err, a) => {
                    if (err) return done(err);

                    assert.deepEqual(session.findFetchedPaths(a), ["b.c"], "Expected path 'b.c' to be fetched.");
                    done();
                });
            });
        });

        it("returns an error if the document discriminator is not known", (done) => {

            var id = helpers.generateId();
            var collection = new MockCollection([{ _id: id, __t: "Foo" }]);

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findOneById(id, (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Unknown discriminator value 'Foo' for class 'Person'.");
                    done();
                });
            });
        });

        it("returns an error if the discriminator is known but does not match the mapping", (done) => {

            var id = helpers.generateId();
            var collection = new MockCollection([{ _id: id, __t: "Person" }]);

            createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = new MockInternalSession(factory);
                var persister = new PersisterImpl(session, factory.getMappingForConstructor(model.Organization), collection);

                persister.findOneById(id, (err, a) => {
                    assert.ok(err);
                    assert.include(err.message, "Unknown discriminator value 'Person' for class 'Organization'.");
                    done();
                });
            });
        });

        it("does not fetch properties flagged as FetchLazy", (done) => {

            var idA = helpers.generateId();

            var collection = new MockCollection();
            collection.onFindOne = (criteria, options, callback) => {
                assert.deepEqual(criteria, { _id: idA });
                assert.deepEqual(options.projection, { _b: 0 });
                done();
            };

            createFactory("fetchLazy", (err, factory) => {
                if (err) return done(err);

                var session = new MockInternalSession(factory);
                var persister = new PersisterImpl(session, factory.getMappingForConstructor(fetchLazyModel.A), collection);

                persister.findOneById(idA, (err, a) => {
                    if (err) return done(err);
                });
            });
        });

        it('returns an EntityNotFoundError if an entity with the specified id does not exists in the database', (done) => {

            var id = helpers.generateId();
            var collection = new MockCollection([]);

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findOneById(id, (err) => {
                    assert.instanceOf(err, EntityNotFoundError);
                    assert.equal(err.message, `Unable to find document with identifier '${id}'.`);
                    done();
                });
            });
        });
    });

    describe('findOne', () => {

    });

    describe('findAll', () => {

        it('executes query with criteria exactly as specified', (done) => {

            var collection = new MockCollection();
            collection.onFind = (criteria) => {
                assert.deepEqual(criteria, { 'name': 'Bob' });
                done();
                return collection.createCursor();
            };

            helpers.createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findAll({ 'name': 'Bob' }, (err, results) => {
                    if(err) return done(err);
                });
            });
        });
    });

    describe('executeQuery', () => {

        describe('findCursor', () => {

            it('creates and returns a cursor for the query', (done) => {

                var collection = new MockCollection();

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.FindCursor);
                    query.criteria = {};

                    persister.executeQuery(query, (err, result) => {
                        if(err) return done(err);

                        // actual cursor implementation is not export so use duck typing to verify it's a cursor
                        assert.property(result, "next");
                        assert.property(result, "close");
                        done();
                    });
                });
            });
        });

        describe('findAll', () => {

            it('translates property names to field names in sort specification', (done) => {

                var collection = new MockCollection();

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    collection.onFind = (criteria) => {

                        var cursor = new MockCursor();

                        cursor.onSort = (keyOrList: any, directionOrCallback: any, callback?: (err: Error, result: any) => void): Cursor => {

                            assert.deepEqual(keyOrList, [ [ 'name', 1 ] ]);
                            done();

                            return cursor;
                        }

                        return cursor;
                    }

                    var query = new QueryDefinitionStub(QueryKind.FindAll);
                    query.criteria = {};
                    query.sortValue = [ [ '_name', 1 ] ];

                    persister.executeQuery(query, (err, results) => {
                        if(err) return done(err);
                    });
                });
            });


            it("only fetches the _id if the query is lazy", (done) => {

                var collection = new MockCollection(),
                    cursor = collection.createCursor();

                collection.onFind = (criteria, fields) => {
                    return cursor;
                };

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.FindAll);
                    query.criteria = {};
                    query.isLazy = true;

                    persister.executeQuery(query, (err, results) => {
                        if(err) return done(err);

                        assert.deepEqual(cursor.projectValue, { _id: 1 });

                        done();
                    });
                });
            });
        });

        describe('distinct', () => {

            it('returns an error if the values returned from the collection are not of the expected type', (done) => {

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

        describe('updateAll', () => {

            it('serializes embedded objects in update document', (done) => {

                var phone = new model.WorkPhone("555-1212", "x15");
                var collection = new MockCollection();
                collection.onUpdateMany = (selector, document, options, callback) => {

                    assert.deepEqual(document, { $inc: { "__v": 1 }, $addToSet: { phones: { "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" }}});
                    done();
                };

                helpers.createPersister(collection, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.UpdateAll);
                    query.criteria = {};
                    query.updateDocument = { $addToSet: { phones: phone }};

                    persister.executeQuery(query, (err, results) => {
                        if(err) return done(err);
                    });
                });
            });

            it('does not increment version field if entity is not versioned', (done) => {

                var phone = new model.WorkPhone("555-1212", "x15");
                var collection = new MockCollection();
                collection.onUpdateMany = (selector, document, options, callback) => {

                    assert.deepEqual(document, { $set: { password: "test" }});
                    done();
                };

                helpers.createPersister(collection, model.User, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.UpdateAll);
                    query.criteria = {};
                    query.updateDocument = { $set: { password: "test" }};

                    persister.executeQuery(query, (err, results) => {
                        if(err) return done(err);
                    });
                });
            });
        });

        describe('findOneAndRemove', () => {

            it('calls findAndModify on the collection', (done) => {

                var id = new ObjectID(),
                    called = false;

                var collection = new MockCollection();
                collection.onFindOneAndDelete = (filter: any, options: any, callback: any) => {

                    assert.deepEqual(filter, { _id: id });
                    called = true;

                    callback(null, { value: { _id: id }});
                };

                helpers.createPersister(collection, model.User, (err, persister) => {
                    if (err) return done(err);

                    var query = new QueryDefinitionStub(QueryKind.FindOneAndRemove);
                    query.criteria = { _id: id };

                    persister.executeQuery(query, (err, result) => {
                        if(err) return done(err);

                        assert.instanceOf(result, User);
                        assert.isTrue(called);
                        done();
                    });
                });
            });
        });
    });
});

