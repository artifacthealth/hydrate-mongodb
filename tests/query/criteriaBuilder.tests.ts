/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>
/// <reference path="../../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import model = require("../fixtures/model");
import helpers = require("../helpers");

import Constructor = require("../../src/core/constructor");
import Callback = require("../../src/core/callback");
import CriteriaBuilder = require("../../src/query/criteriaBuilder");
import QueryDocument = require("../../src/query/queryDocument");

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
