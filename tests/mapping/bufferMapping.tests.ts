/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>
/// <reference path="../../typings/async.d.ts" />
/// <reference path="../../typings/mongodb.d.ts" />

import {Binary} from "mongodb";
import * as async from "async";
import {assert} from "chai";
import {BufferMapping} from "../../src/mapping/bufferMapping";
import {ReadContext} from "../../src/mapping/readContext";

describe('BufferMapping', () => {

    describe('read', () => {

        it('returns a buffer for the bson Binary data', () => {

            var mapping = new BufferMapping();

            var testValue = "test";
            var result = mapping.read(new ReadContext(null), new Binary(new Buffer(testValue))).toString("utf8");

            assert.equal(result, testValue);
        });
    });

    describe('write', () => {

        it('returns bson Binary data for the Buffer', () => {

            var mapping = new BufferMapping();

            var testValue = "test";
            var result = mapping.write(new Buffer(testValue), "", [], []).value();

            assert.equal(result, testValue);
        });
    });

});
