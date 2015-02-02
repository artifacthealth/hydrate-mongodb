/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;
import helpers = require("../helpers");
import model = require("../fixtures/model");

import MappingRegistry = require("../../src/mapping/MappingRegistry");
import Mapping = require("../../src/mapping/mapping");
import EntityMapping = require("../../src/mapping/entityMapping");
import ClassMapping = require("../../src/mapping/classMapping");

describe('MappingRegistry', () => {

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

    partyMapping: EntityMapping;
    personMapping: EntityMapping;
    addressMapping: ClassMapping;
    registry: MappingRegistry;
}

function createFixture() {

    var fixture = helpers.requireFixture("model");
    var registry = new MappingRegistry();

    var partyMapping = new EntityMapping();
    partyMapping.classConstructor = model.Party;
    var personMapping = new EntityMapping(partyMapping);
    personMapping.classConstructor = model.Person;
    var addressMapping = new ClassMapping();
    addressMapping.classConstructor = model.Address;

    registry.addMapping(partyMapping);
    registry.addMapping(personMapping);
    registry.addMapping(addressMapping);

    return {
        partyMapping: partyMapping,
        personMapping: personMapping,
        addressMapping: addressMapping,
        registry: registry
    }
}
