import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";
import {EntityMapping} from "../../src/mapping/entityMapping";
import {ObjectIdGenerator} from "../../src/config/objectIdGenerator";

describe('EntityMapping', () => {

    describe('areEqual', () => {

        it('returns true if both values are null', () => {

            var mapping = createMapping();
            assert.isTrue(mapping.areEqual(null, null));
        });

        it('return false if one value is null and the other is not', () => {

            var mapping = createMapping();

            assert.isFalse(mapping.areEqual(null, {}));
            assert.isFalse(mapping.areEqual({}, null));
        });

        it('returns true if the _id of both documents match', () => {

            var mapping = createMapping();
            var id = helpers.generateId();
            assert.isTrue(mapping.areEqual({ _id: id }, { _id: id} ));
        });

        it('returns true if the _id of both documents do not match', () => {

            var mapping = createMapping();
            assert.isFalse(mapping.areEqual({ _id: helpers.generateId() }, { _id: helpers.generateId() } ));
        });

        it('returns true if the _id of one argument is equal to the value of the other argument', () => {

            var mapping = createMapping();
            var id = helpers.generateId();
            assert.isTrue(mapping.areEqual({ _id: id }, id));
            assert.isTrue(mapping.areEqual(id, { _id: id }));
        });
    });
});

function createMapping(): EntityMapping {

    var mapping = new EntityMapping();
    mapping.inheritanceRoot = mapping;
    mapping.identity = new ObjectIdGenerator();
    return mapping;
}