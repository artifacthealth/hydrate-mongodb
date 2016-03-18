import {Binary} from "mongodb";
import * as async from "async";
import {assert} from "chai";
import {BufferMapping} from "../../src/mapping/bufferMapping";
import {ReadContext} from "../../src/mapping/readContext";
import {WriteContext} from "../../src/mapping/writeContext";

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
            var context = new WriteContext();
            var result = mapping.write(context, new Buffer(testValue)).value();
            if(context.hasErrors) {
                throw new Error(context.getErrorMessage());
            }

            assert.equal(result, testValue);
        });
    });

});
