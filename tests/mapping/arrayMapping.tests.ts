/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;
import helpers = require("../helpers");
import model = require("../fixtures/model");

import ArrayMapping = require("../../src/mapping/arrayMapping");
import EntityMapping = require("../../src/mapping/entityMapping");
import ObjectIdGenerator = require("../../src/id/objectIdGenerator");
import ReadContext = require("../../src/mapping/readContext");

describe('ArrayMapping', () => {

    describe('read', () => {

        it('passes through null values in array', () => {

            var mapping = createMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [null]);

            assert.deepEqual(result, [null]);
        });

        it('transforms undefined values to null values', () => {

            var mapping = createMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [undefined]);

            assert.deepEqual(result, [null]);
        });
    });
});

function createMapping(): ArrayMapping {

    var entityMapping = new EntityMapping();
    entityMapping.inheritanceRoot = entityMapping;
    entityMapping.identity = new ObjectIdGenerator();

    var mapping = new ArrayMapping(entityMapping);

    return mapping;
}