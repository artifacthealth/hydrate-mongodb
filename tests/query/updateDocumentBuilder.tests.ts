/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>
/// <reference path="../../typings/async.d.ts" />

import {assert} from "chai";
import * as async from "async";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";
import {Constructor} from "../../src/core/constructor";
import {Callback} from "../../src/core/callback";
import {UpdateDocumentBuilder} from "../../src/query/updateDocumentBuilder";
import {QueryDocument} from "../../src/query/queryDocument";

describe('UpdateDocumentBuilder', () => {

    it('returns empty document if empty document passed in', (done) => {

        assertDocument(done, {}, {});
    });

    it('returns empty document if empty document passed in', (done) => {

        assertDocument((err) => {
            // TODO: check error code
            assert.instanceOf(err, Error);
            done();
        }, { $currentDate: { "blah": "date", "createdAt": "date" }}, {});
    });

    it('checks that property names exist on the target mapping', (done) => {

        assertDocument(done, {}, {});
    });

    it('correctly resolve dot notation in field name', (done) => {

        assertDocument(done, { $set: { "personName.last": "Jones" }}, { $set: { "personName.last": "Jones" }});
    });

    it('translates property names to field names in path', (done) => {

        assertDocument(done, { $set: { "_name": "Bob Jones" }}, { $set: { "name": "Bob Jones" }});
    });

    it('returns error if value is not of expected type', (done) => {

        assertDocument((err) => {
            // TODO: check error code
            assert.instanceOf(err, Error);
            done();
        }, { $set: { "birthDate": "Bob Jones" }}, { $set: { "birthDate": "Bob Jones" }});
    });

    it('correctly prepares document with $currentDate operator', (done) => {

        assertDocument(done, { $currentDate: { "birthDate": "date", "createdAt": "date" }}, { $currentDate: { "birthDate": "date", "createdAt": "date"  }});
    });

    it('correctly prepares document with $inc operator', (done) => {

        assertDocument(done, { $inc: { "age": 1 }}, { $inc: { "age": 1 }});
    });

    it('correctly prepares document with $mul operator', (done) => {

        assertDocument(done, { $mul: { "age": 10 }}, { $mul: { "age": 10 }});
    });

    it('correctly prepares document with $rename operator', (done) => {

        assertDocument(done, { $rename: { "age": "something else" }}, { $rename: { "age": "something else" }});
    });

    it('correctly prepares document with $unset operator', (done) => {

        assertDocument(done, { $unset: { "_name": 1 }}, { $unset: { "name": 1 }});
    });

    it('correctly prepares document with $pop operator', (done) => {

        assertDocument(done, { $pop: { "parents": 1 }}, { $pop: { "parents": 1 }});
    });

    it('correctly prepares document with $bit operator', (done) => {

        assertDocument(done, { $bit: { "age": { and: 10 } }}, { $bit: { "age": { and: 10 }}});
    });

    it('correctly prepares document with $addToSet operator', (done) => {

        var person = helpers.createPerson();
        assertDocument(done, { $addToSet: { "parents": person }}, { $addToSet: { "parents": (<any>person)._id } });
    });

    it('return an error if $addToSet operator is used with a non-array property', (done) => {

        assertDocument((err) => {
            // TODO: check error code
            assert.instanceOf(err, Error);
            done();
        }, { $addToSet: { "age": 1 }}, { $addToSet: { "age": 1 } });
    });

    it('correctly prepares document with $push operator', (done) => {

        var phone = new model.WorkPhone("555-1212", "x15");
        assertDocument(done, { $push: { phones: phone }}, { $push: { phones: { "__t": "WorkPhone", "extension": "x15", "number": "555-1212", "type": "Work" }}});
    });

    it('correctly prepares document with modifiers on $push operator', (done) => {

        assertDocument(done, { $push: { aliases: { $each: [ "bob", "mark" ], $position: 1, $slice: -2, $sort: -1 }}},
            { $push: { aliases: { $each: [ "bob", "mark" ], $position: 1, $slice: -2, $sort: -1 }}});
    });

    it('correctly prepares document with $sort modifier on $push operator for array of embedded documents', (done) => {

        var phone = new model.Phone("555-1212", model.PhoneType.Home);
        assertDocument(done, { $push: { phones: { $each: [ phone ], $sort: { type: model.PhoneType.Work} }}},
            { $push: { phones: { $each: [ { "__t": "Phone", "number": "555-1212", "type": "Home"} ], $sort: { type: "Work"} }}});
    });

    it('correctly prepares document with $max operator', (done) => {

        assertDocument(done, { $max: { "age": 21 }}, { $max: { "age": 21 }});
    });

    it('correctly prepares document with $min operator', (done) => {

        assertDocument(done, { $min: { "age": 21 }}, { $min: { "age": 21 }});
    });

    it('correctly prepares document with $setOnInsert operator', (done) => {

        assertDocument(done, { $setOnInsert: { "age": 21, "_name": "Bob" }}, { $setOnInsert: { "age": 21, "name": "Bob" }});
    });

    it('correctly prepares document with $set operator', (done) => {

        assertDocument(done, { $set: { "age": 21, "_name": "Bob" }}, { $set: { "age": 21, "name": "Bob" }});
    });

    it('correctly prepares document with $pullAll operator', (done) => {

        assertDocument(done, { $pullAll: { aliases: [ "bob", "jones" ]}}, { $pullAll: { aliases: [ "bob", "jones" ]}});
    });

    it('correctly prepares document with $pushAll operator', (done) => {

        assertDocument(done, { $pushAll: { aliases: [ "bob", "jones" ]}}, { $pushAll: { aliases: [ "bob", "jones" ]}});
    });

    it('return an error if $pushAll operator is used with a non-array property', (done) => {

        assertDocument((err) => {
            // TODO: check error code
            assert.instanceOf(err, Error);
            done();
        }, { $pushAll: { email: [ "bob", "jones" ]}}, { $pushAll: { email: [ "bob", "jones" ]}});
    });

    it('correctly prepares document with $pull operator', (done) => {

        assertDocument(done, { $pull: { aliases: { $in: [ "bob", "mark" ]}}}, { $pull: { aliases: { $in: [ "bob", "mark" ]}}});
    });

    it('correctly prepares document with $pull operator for array of embedded documents', (done) => {

        assertDocument(done, { $pull: { phones: { type: model.PhoneType.Work }}}, { $pull: { phones: { "__t": { "$in": ["Phone", "WorkPhone"] }, type: "Work" }}});
    });

    it('returns error if a document replacement is attempted', (done) => {

        var person = helpers.createPerson();
        var id = (<any>person)._id;
        assertDocument((err) => {
            // TODO: check error code
            assert.instanceOf(err, Error);
            done();
        }, person, {"__t": "Person", "_id": id, "name": "Jones, Bob", "personName": { "first": "Bob", "last": "Jones"  }});
    });
});

function assertDocument(done: Callback, originalDocument: any, expectedDocument: QueryDocument, ctr?: Constructor<any>): void {

    helpers.createFactory("model", (err, factory) => {
        if (err) return done(err);

        factory.getMappingForConstructor(ctr || model.Person, (err, mapping) => {
            if(err) return done(err);

            var builder = new UpdateDocumentBuilder(mapping)
            var result = builder.build(originalDocument);
            if(builder.error) {
                return done(builder.error);
            }

            assert.deepEqual(result, expectedDocument);
            done();
        });
    });
}


