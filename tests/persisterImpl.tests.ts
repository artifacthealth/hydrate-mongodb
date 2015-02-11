/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import util = require("util");

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import model = require("./fixtures/model");
import helpers = require("./helpers");

import PersisterImpl = require("../src/persisterImpl");
import MockCollection = require("./driver/mockCollection");
import ObjectIdGenerator = require("../src/id/objectIdGenerator");
import MockSessionFactory = require("./mockSessionFactory");
import Callback = require("../src/core/callback");

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

            var person = createPerson();
            var id =  (<any>person)._id;

            var collection = new MockCollection();
            collection.onFind = (criteria) => {
                assert.deepEqual(criteria, { __t: "Person", parents: id });
                done();
                return collection.createCursor();
            }

            createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findInverseOf(person, "parents", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("does not include the discriminator in the criteria if the mapping is not part of an inheritance hierarchy", (done) => {

            var person = createPerson();
            var id =  (<any>person)._id;

            var collection = new MockCollection();
            collection.onFind = (criteria) => {
                assert.deepEqual(criteria, { person: id });
                done();
                return collection.createCursor();
            }

            createPersister(collection, model.User, (err, persister) => {
                if (err) return done(err);

                persister.findInverseOf(person, "person", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("returns an error if specified path does not represent a property in the mapping", (done) => {

            createPersister(new MockCollection(), (err, persister) => {
                if (err) return done(err);

                var person = createPerson();

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

            var person = createPerson();
            var id =  (<any>person)._id;

            var collection = new MockCollection();
            collection.onFindOne = (criteria, callback) => {
                assert.deepEqual(criteria, { __t: "Person", parents: id });
                callback(null, { _id: id });
                done();
            }

            createPersister(collection, (err, persister) => {
                if (err) return done(err);

                persister.findOneInverseOf(person, "parents", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("does not include the discriminator in the criteria if the mapping is not part of an inheritance hierarchy", (done) => {

            var person = createPerson();
            var id =  (<any>person)._id;

            var collection = new MockCollection();
            collection.onFindOne = (criteria, callback) => {
                assert.deepEqual(criteria, { person: id });
                callback(null, { _id: id });
                done();
            }

            createPersister(collection, model.User, (err, persister) => {
                if (err) return done(err);

                persister.findOneInverseOf(person, "person", (err, results) => {
                    if(err) return done(err);
                });
            });
        });

        it("returns an error if specified path does not represent a property in the mapping", (done) => {

            createPersister(new MockCollection(), (err, persister) => {
                if (err) return done(err);

                var person = createPerson();

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

    describe("processing of query criteria", () => {

        it('results in empty criteria if original critieria is empty and mapping is not part of an inheritance hierarchy', (done) => {

            assertCriteria(done, {}, {}, model.User);
        });

        it('includes the discriminator value if mapping is part of an inheritance hierarchy', (done) => {

            assertCriteria(done, {}, { "__t": "Person" });
        });

        it('translates property names on entities to field names', (done) => {

            assertCriteria(done, { _name: "Bob" }, { "__t": "Person", name: "Bob" });
        });

        it('serializes embedded object when provided as a field equality condition', (done) => {

            var phone = new model.WorkPhone("555-1212", "x15");
            assertCriteria(done, { workPhone: phone },
                { "__t": "Person", workPhone: { "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" } });
        });

        it("convert entity to identifier when entity is provided as a field equality condition", (done) => {

            var person = createPerson();
            assertCriteria(done, { person: person }, {  person: (<any>person)._id }, model.User);
        });

        it('translates property names to field names when specifying equality match on fields in embedded documents', (done) => {

            // TODO: can't do "phones._extension" because phones is of type Phone. Perhaps way to cast in query?
            assertCriteria(done, { "workPhone._extension": "x15" }, { "__t": "Person", "workPhone.extension": "x15" });
        });

        it('converts enum value to string (if enum is configured to save value as string) when enum is specified as a field equality condition', (done) => {

            assertCriteria(done, { "gender": model.Gender.Female }, { "__t": "Person", "gender": "Female" });
        });

        it("correctly creates criteria for an exact match on an array of embedded objects", (done) => {

            var phone = new model.WorkPhone("555-1212", "x15");
            assertCriteria(done, { phones: [phone] },
                { "__t": "Person", phones: [{ "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" }] });
        });

        it("correctly creates criteria for matching an array element to an embedded object", (done) => {

            var phone = new model.WorkPhone("555-1212", "x15");
            assertCriteria(done, { phones: phone },
                { "__t": "Person", phones: { "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" } });
        });

        it("correctly creates criteria for matching an array element to an entity", (done) => {

            var person = createPerson();
            assertCriteria(done, { parents: person }, { "__t": "Person", parents: (<any>person)._id });
        });

        it("correctly creates criteria for matching a specific element in an array to an entity", (done) => {

            var person = createPerson();
            assertCriteria(done, { "parents.0": person }, { "__t": "Person", "parents.0": (<any>person)._id });
        });

        it("correctly creates criteria for matching a specific element in an array to an embedded object", (done) => {

            var phone = new model.WorkPhone("555-1212", "x15");
            assertCriteria(done, { "phones.0": phone }, { "__t": "Person", "phones.0": { "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" } });
        });

        it("correctly creates criteria for matching multiple criteria for an array element using conditional operator", (done) => {

            assertCriteria(done, { phones: { $elemMatch: { $or: [ { number: "555-1212" }, { type: model.PhoneType.Home }]}}},
                { "__t": "Person", "phones": { "$elemMatch": { "$or": [ { "number": "555-1212" }, { "type": "Home" } ] }}});
        });

        it("correctly creates criteria for matching multiple criteria for an array element using comparison operator", (done) => {

            var phone = new model.WorkPhone("555-1212", "x15");
            assertCriteria(done, { phones: { $elemMatch: { $in: [ phone ] }}},
                { "__t": "Person", "phones": { "$elemMatch": { "$in": [ { "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" } ] }} });
        });

        it("correctly creates criteria for matching a field in an embedded document using an array index", (done) => {

            assertCriteria(done, { "phones.0.type": model.PhoneType.Work }, { "__t": "Person", "phones.0.type": "Work" });
        });

        it("correctly creates criteria for matching a field in an embedded document without specifying an array index", (done) => {

            assertCriteria(done, { "phones.type": model.PhoneType.Work }, { "__t": "Person", "phones.type": "Work" });
        });

        it("correctly creates criteria for $gt operator", (done) => {

            assertCriteria(done, { "age": { $gt: 21 } }, { "__t": "Person", "age": { $gt: 21 } });
        });

        it("correctly creates criteria for $gte operator", (done) => {

            assertCriteria(done, { "age": { $gte: 21 } }, { "__t": "Person", "age": { $gte: 21 } });
        });

        it("correctly creates criteria for $lt operator", (done) => {

            assertCriteria(done, { "age": { $lt: 21 } }, { "__t": "Person", "age": { $lt: 21 } });
        });

        it("correctly creates criteria for $lte operator", (done) => {

            assertCriteria(done, { "age": { $lte: 21 } }, { "__t": "Person", "age": { $lte: 21 } });
        });

        it("correctly creates criteria for $in operator", (done) => {

            assertCriteria(done, { "gender": { $in: [ model.Gender.Male, model.Gender.Female ] } },
                { "__t": "Person", "gender": { $in: [ "Male", "Female" ] } });
        });

        it("correctly creates criteria for $nin operator", (done) => {

            assertCriteria(done, { "gender": { $nin: [ model.Gender.Male, model.Gender.Female ] } },
                { "__t": "Person", "gender": { $nin: [ "Male", "Female" ] } });
        });

        it("correctly creates criteria for $not operator", (done) => {

            assertCriteria(done, { "age": { $not: { $lte: 21 } } }, { "__t": "Person", "age": { $not: { $lte: 21 } }});
        });

        it("correctly creates criteria for $exists operator", (done) => {

            assertCriteria(done, { "age": { $exists: true, $gt: 42 }}, { "__t": "Person", "age": { $exists: true, $gt: 42 }});
        });

        it("allows regular expressions in an $in operator in place of a string value", (done) => {

            assertCriteria(done, { "_name": { $in: [ /^acme/i, /^ack/ ]}}, { "__t": "Person", "name": { $in: [ /^acme/i, /^ack/ ]}});
        });

        it("allows regular expressions as a field equality condition in place of a string value", (done) => {

            assertCriteria(done, { "_name": /^acme/i }, { "__t": "Person", "name": /^acme/i });
        });

        it("allows regular expressions as a field equality condition for an array an array of strings", (done) => {

            assertCriteria(done, { "aliases": /^M.*/i }, { "__t": "Person", "aliases": /^M.*/i });
        });

        function assertCriteria(done: Callback, originalCriteria: Object, processedCriteria: Object, ctr?: Function): void {

            var collection = new MockCollection();
            collection.onFind = (query) => {
                assert.deepEqual(query, processedCriteria);
                done();
                return collection.createCursor();
            }

            createPersister(collection, ctr || model.Person, (err, persister) => {
                if (err) return done(err);

                persister.findAll({ criteria: originalCriteria }, (err) => {
                    if(err) return done(err);
                });
            });
        }
    });

});

var generator = new ObjectIdGenerator();

function generateId(): any {
    return generator.generate();
}

function createPerson(): model.Person {
    var person = new model.Person(new model.PersonName("Jones", "Bob"));
    (<any>person)._id = generateId();
    return person;
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
