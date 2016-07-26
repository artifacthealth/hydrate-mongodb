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

    describe("areEqual", () => {

        it('returns true if both values are null', () => {

            var mapping = new BufferMapping();
            assert.isTrue(mapping.areEqual(null, null));
        });

        it('return false if one value is null and the other is not', () => {

            var mapping = new BufferMapping();

            assert.isFalse(mapping.areEqual(null, {}));
            assert.isFalse(mapping.areEqual({}, null));
        });

        it("returns true if the contents of the Buffers are equal", () => {

            compareBuffers("Some value", "Some value", true);
        });

        it("returns false if the contents of the Buffers are not equal", () => {

            compareBuffers("Some value", "Some other value", false);
        });

        function compareBuffers(text1: string, text2: string, result: boolean): void {

            var mapping = new BufferMapping();

            var buffer1 = new Buffer(text1),
                buffer2 = new Buffer(text2);

            var context1 = new WriteContext(),
                context2 = new WriteContext();

            var value1 = mapping.write(context1, buffer1),
                value2 = mapping.write(context2, buffer2);

            assert.ok(value1);
            assert.ok(value2);

            if (context1.hasErrors) {
                throw new Error(context1.getErrorMessage());
            }

            if (context2.hasErrors) {
                throw new Error(context2.getErrorMessage());
            }

            assert.equal(mapping.areEqual(value1, value2), result);
        }
    });
});
