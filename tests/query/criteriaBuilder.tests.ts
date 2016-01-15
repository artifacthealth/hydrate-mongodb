/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>
/// <reference path="../../typings/async.d.ts" />
/// <reference path="../../typings/mongodb.d.ts" />

import {ObjectID} from "mongodb";
import {assert} from "chai";
import * as async from "async";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";
import {Constructor} from "../../src/core/constructor";
import {Callback} from "../../src/core/callback";
import {CriteriaBuilder} from "../../src/query/criteriaBuilder";
import {QueryDocument} from "../../src/query/queryDocument";

describe('CriteriaBuilder', () => {

    it('results in empty criteria if original criteria is empty and mapping is not part of an inheritance hierarchy', (done) => {

        assertCriteria(done, {}, {}, model.User);
    });

    it('includes the discriminator value if mapping is part of an inheritance hierarchy', (done) => {

        assertCriteria(done, {}, { "__t": "Person" });
    });

    it('includes list of discriminator values if mapping has subclasses', (done) => {

        assertCriteria(done, {}, { "__t": { "$in": ["Party", "Person", "Organization"] } }, model.Party);
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

        var person = helpers.createPerson();
        assertCriteria(done, { person: person }, {  person: (<any>person)._id }, model.User);
    });

    it('returns error if value of $and operation is not an array', (done) => {

        assertError(done, { $and: true }, "operator should be an array", model.User);
    });

    it('returns error if value of $or operation is not an array', (done) => {

        assertError(done, { $and: true }, "operator should be an array", model.User);
    });

    it('returns error if value of $nor operation is not an array', (done) => {

        assertError(done, { $and: true }, "operator should be an array", model.User);
    });

    it('returns error if $text operator is used inside of an $elemMatch', (done) => {

        assertError(done,  { additionalNames: { $elemMatch: { $text: { $search: 'test' } } } }, "is not allowed in $elemMatch", model.Person);
    });

    it('returns error if $where operator is used inside of an $elemMatch', (done) => {

        assertError(done,  { additionalNames: { $elemMatch: { $where: "this.first == this.last" } } }, "is not allowed in $elemMatch", model.Person);
    });

    it('returns error if invalid top-level operator is used', (done) => {

        assertError(done,  { $foo: true }, "Unknown top-level operator '$foo'.", model.Person);
    });

    it('translates string to valid identity if _id field is used in query', (done) => {

        assertCriteria(done, { _id: "565b1dd7dbd1e1815aa5ab4d" }, { "__t": "Person", _id: new ObjectID("565b1dd7dbd1e1815aa5ab4d") });
    });

    it('returns error if string passed as _id is not a valid identifier', (done) => {

        assertError(done,  { _id: "foo" }, "Missing or invalid identifier", model.Person);
    });

    it('returns error if null value is passed as id', (done) => {

        assertError(done,  { _id: null }, "Missing or invalid identifier", model.Person);
    });

    it('returns error if field path does not exist', (done) => {

        assertError(done,  { "foo": "bar" }, "Undefined property for class", model.Person);
    });

    it('returns error if missing expected query expression', (done) => {

        assertError(done,  { "gender": { $not: null } }, "Missing value for operator '$not'.", model.Person);
    });

    it('returns error if non-query key is mixed with query expression', (done) => {

        assertError(done,  { "username": { $not: "Bob", "test": "Bob" } }, "Unexpected value 'test' in query expression.", model.User);
    });

    it('returns error if unknown query operator is used', (done) => {

        assertError(done,  { "username": { $test: 'Bob' } }, "Unknown query operator '$test'.", model.User);
    });

    it('returns error if array is not provided for $in operator', (done) => {

        assertError(done,  { "username": { $in: 'Bob' } }, "Expected array for '$in' operator.", model.User);
    });

    it('returns error if array is not provided for $nin operator', (done) => {

        assertError(done,  { "username": { $nin: 'Bob' } }, "Expected array for '$nin' operator.", model.User);
    });

    it('returns error if array is not provided for $all operator', (done) => {

        assertError(done,  { "username": { $all: 'Bob' } }, "Expected array for '$all' operator.", model.User);
    });

    it('translates property names to field names when specifying equality match on fields in embedded documents', (done) => {

        // TODO: can't do "phones._extension" because phones is of type Phone. Perhaps way to cast in query?
        assertCriteria(done, { "workPhone._extension": "x15" }, { "__t": "Person", "workPhone.extension": "x15" });
    });

    it('converts enum value to string (if enum is configured to save value as string) when enum is specified as a field equality condition', (done) => {

        assertCriteria(done, { "gender": model.Gender.Female }, { "__t": "Person", "gender": "Female" });
    });

    it('uses property converter for property value in field equality condition', (done) => {

        assertCriteria(done, { "preferredPhone": model.PhoneType.Work }, { "__t": "Person", "preferredPhone": "W" });
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

        var person = helpers.createPerson();
        assertCriteria(done, { parents: person }, { "__t": "Person", parents: (<any>person)._id });
    });

    it("correctly creates criteria for matching a specific element in an array to an entity", (done) => {

        var person = helpers.createPerson();
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

});

function assertCriteria(done: Callback, originalCriteria: QueryDocument, expectedCriteria: QueryDocument, ctr?: Constructor<any>): void {

    helpers.createFactory("model", (err, factory) => {
        if (err) return done(err);

        var builder = new CriteriaBuilder(factory.getMappingForConstructor(ctr || model.Person))
        var result = builder.build(originalCriteria);
        if(builder.error) {
            return done(builder.error);
        }
        assert.deepEqual(result, expectedCriteria);
        done();
    });
}

function assertError(done: Callback, originalCriteria: QueryDocument, message: string, ctr?: Constructor<any>): void {

    helpers.createFactory("model", (err, factory) => {
        if (err) return done(err);

        var builder = new CriteriaBuilder(factory.getMappingForConstructor(ctr || model.Person))
        var result = builder.build(originalCriteria);
        assert.instanceOf(builder.error, Error, "Expected error");
        assert.include(builder.error.message, message);
        done();
    });
}
