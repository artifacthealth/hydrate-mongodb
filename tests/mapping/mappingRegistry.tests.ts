import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";
import {MappingRegistry} from "../../src/mapping/MappingRegistry";
import {EntityMapping} from "../../src/mapping/entityMapping";
import {ClassMapping} from "../../src/mapping/classMapping";

describe('MappingRegistry', () => {

    describe('addMapping', () => {

        it('throws error if mapping does not have a classConstructor', () => {

            assert.throws(() => {
                var registry = new MappingRegistry();
                registry.addMapping(new EntityMapping());

            }, Error, "Class mapping is missing classConstructor.");
        });

        it('throws error if classConstructor for mapping is already mapped', () => {

            var registry = new MappingRegistry();

            var mapping1 = new EntityMapping();
            mapping1.classConstructor = model.Party;

            var mapping2 = new EntityMapping();
            mapping2.classConstructor = model.Party;

            registry.addMapping(mapping1);

            assert.throws(() => {
                registry.addMapping(mapping2);

            }, Error, "Mapping 'Party' has already been registered.");
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

    describe('getEntityMappings', () => {

        it('returns a list of all entity mappings in the registry', () => {

            var fixture = createFixture();
            var mappings = fixture.registry.getEntityMappings();
            assert.equal(mappings.length, 2);
            assert.equal(mappings[0], fixture.partyMapping);
            assert.equal(mappings[1], fixture.personMapping);
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
