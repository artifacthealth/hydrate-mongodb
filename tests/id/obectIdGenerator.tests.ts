import {assert} from "chai";
import {ObjectIdGenerator} from "../../src/config/objectIdGenerator";
import {ObjectID} from "mongodb";

describe('ObjectIdGenerator', () => {

    var generator = new ObjectIdGenerator();

    describe('generate', () => {

        it('returns a new ObjectID', () => {

            assert.instanceOf(generator.generate(), ObjectID);
        });
    });

    describe('validate', () => {

        it('returns true if value is a valid ObjectID', () => {

            assert.isTrue(generator.validate(generator.generate()));
        });

        it('returns false if value is null or undefined', () => {

            assert.isFalse(generator.validate(null));
            assert.isFalse(generator.validate(undefined));
        });

        it('returns false if value is not an ObjectID', () => {

            assert.isFalse(generator.validate("Foo"));
        });
    });

    describe('fromString', () => {

        it('returns null if value is null', () => {

            assert.isNull(generator.fromString(null));
        });

        it('returns null if passed string does not have a length of 24', () => {

            assert.isNull(generator.fromString("Foo"));
        });

        it('returns the an ObjectID for a valid string representation of an ObjectID', () => {

            var text = "565dd4e04ea7288d0af6177a";
            var id = generator.fromString("565dd4e04ea7288d0af6177a");
            assert.instanceOf(id, ObjectID);
            assert.equal(id.toString(), text);
        });
    });

    describe('areEqual', () => {

        it('returns false if two instances of an ObjectID do not have the same value', () => {

            assert.isFalse(generator.areEqual(new ObjectID("565dd4e04ea7288d0af6177a"), new ObjectID("565b68c7927ed986609418b0")));
        });

        it('returns true if two instances of an ObjectID have the same value', () => {

            assert.isTrue(generator.areEqual(new ObjectID("565dd4e04ea7288d0af6177a"), new ObjectID("565dd4e04ea7288d0af6177a")));
        });
    });
});