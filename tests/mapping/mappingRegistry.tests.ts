/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;
import helpers = require("../helpers");
import model = require("../fixtures/model");

import MappingRegistry = require("../../src/mapping/MappingRegistry");
import TypeMapping = require("../../src/mapping/typeMapping");
import TypeMappingFlags = require("../../src/mapping/typeMappingFlags");

describe('MappingRegistry', () => {

    describe('getMappingForType', () => {

        it('returns the mapping for the specified type', () => {

            var fixture = createFixture();
            assert.equal(fixture.registry.getMappingForType(fixture.partyMapping.type), fixture.partyMapping);
        });
    });

    describe('getMappingForObject', () => {

        it('returns the mapping for the specified object', () => {

            var fixture = createFixture();
            var person = new model.Person(new model.PersonName("Jones", "Bob"));
            assert.equal(fixture.registry.getMappingForObject(person), fixture.personMapping);
        });
    });

    describe('getMappingForConstructor', () => {

        it('returns the mapping for the specified constructor', () => {

            var fixture = createFixture();
            assert.equal(fixture.registry.getMappingForConstructor(model.Address), fixture.addressMapping);
        });

        it('returns undefined if constructor is not found', () => {

            var fixture = createFixture();
            assert.isUndefined(fixture.registry.getMappingForConstructor(model.Phone));
        });
    });
});

interface Fixture {

    partyMapping: TypeMapping;
    personMapping: TypeMapping;
    addressMapping: TypeMapping;
    registry: MappingRegistry;
}

function createFixture() {

    var fixture = helpers.requireFixture("model");

    var partyMapping = new TypeMapping(fixture.resolve("Party").getDeclaredType(), TypeMappingFlags.DocumentType|TypeMappingFlags.RootType);
    var personMapping = new TypeMapping(fixture.resolve("Person").getDeclaredType(), TypeMappingFlags.DocumentType);
    var addressMapping = new TypeMapping(fixture.resolve("Address").getDeclaredType(), TypeMappingFlags.EmbeddedType);

    var registry = new MappingRegistry([ partyMapping, personMapping, addressMapping ]);

    return {
        partyMapping: partyMapping,
        personMapping: personMapping,
        addressMapping: addressMapping,
        registry: registry
    }
}
