/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;
import helpers = require("../helpers");
import model = require("../fixtures/model");
import MongoDriver = require("../../src/driver/mongoDriver");

import MappingRegistry = require("../../src/mapping/mappingRegistry");
import SessionFactoryImpl = require("../../src/sessionFactoryImpl");
import AnnotationMappingProvider = require("../../src/mapping/providers/annotationMappingProvider");
import Configuration = require("../../src/config/configuration");

import EntityMapping = require("../../src/mapping/entityMapping");
import StringMapping = require("../../src/mapping/stringMapping");
import ArrayMapping = require("../../src/mapping/arrayMapping");
import ClassMapping = require("../../src/mapping/classMapping");
import EnumMapping = require("../../src/mapping/enumMapping");
import Property = require("../../src/mapping/property");

describe('DocumentSerializer', () => {

    describe('read', () => {

        // loads 10,000 objects in about 105ms
        it.skip('test assignment', (done) => {

            var start = process.hrtime();

            for(var i = 0; i < 10000; i++) {
                var a: any = {};
                for(var j = 0; j < 100; j++) {
                    a["test." + j] = 0;
                }
            }

            // divide by a million to get nano to milli
            var elapsed = process.hrtime(start);
            console.log("assigned " + i + " values in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
            done();
        });

        // loads 10,000 objects in about 105ms
        it('performance test', (done) => {

            var mappingProvider = new AnnotationMappingProvider(new Configuration());
            mappingProvider.addFile("build/tests/fixtures/model.d.json");
            mappingProvider.getMapping((err, registry) => {
                if (err) return done(err);

                var fixture = helpers.requireFixture("model");
                var factory = new SessionFactoryImpl({}, registry);
                var identity = (<EntityMapping>registry.getMappingForConstructor(model.Person).inheritanceRoot).identity;

                var mapping = registry.getMappingForConstructor(model.Person);

                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];
                (<any>person)._id = identity.generate();
                person.addAttribute("eye color", "hazel");
                person.addAttribute("hair color", "brown");
                person.addAttribute("temperament", "angry");

                for(var i = 0; i < 100; i++) {
                    var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                    (<any>parent1)._id = identity.generate();
                    person.addParent(parent1);
                }

                var errors: any[] = [];
                var visited: any[] = [];
                var document = mapping.write(person, null, errors, visited);
                var obj = mapping.read(document, null, errors);
               // obj.parents = obj.parents.reverse();
                //obj.gender = model.Gender.Male;

                var start = process.hrtime();

                for(var i = 0; i < 10000; i++) {
                    var errors: any[] = [];
    //                var visited: any[] = [];
    //                var document = mapping.write(person, "", errors, visited);
                     var obj = mapping.read(document, null, errors);
    //                var changes: any = {};
    //                mapping.compare(obj, document, changes, "");
                }

                // divide by a million to get nano to milli
                var elapsed = process.hrtime(start);
                console.log("loaded " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

                done();
            });
        });
/*
        it('performance test2', (done) => {

            var personName = new ClassMapping();
            personName.classConstructor = model.PersonName;
            personName.discriminatorField = "__t";
            personName.discriminatorValue = "PersonName";

            var property = new Property();
            property.field = property.name = "first";
            property.mapping = new StringMapping();
            personName.properties.push(property);

            var personMapping = new EntityMapping();
            personMapping.discriminatorField = "__t";
            personMapping.discriminatorValue = "Person";

            var property = new Property();
            property.field = property.name = "personName";
            property.mapping = personName;
            personMapping.properties.push(property);
            personMapping.classConstructor = model.Person;

            var mappingProvider = new AnnotationMappingProvider(new Configuration());
            mappingProvider.addFile("build/tests/fixtures/model.d.json");
            mappingProvider.getMapping((err, mappings) => {
                if (err) return done(err);

                var fixture = helpers.requireFixture("model");
                var registry = new MappingRegistry(mappings);
                var factory = new SessionFactoryImpl({}, registry);
                var serializer = new Serializer(factory, fixture.resolve("Person").getDeclaredType());
                var identity = registry.getMappingForConstructor(model.Person).root.identity;

                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];
                (<any>person)._id = identity.generate();
                person.addAttribute("eye color", "hazel");
                person.addAttribute("hair color", "brown");
                person.addAttribute("temperament", "angry");

                var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                (<any>parent1)._id = identity.generate();
                person.addParent(parent1);

                var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
                (<any>parent2)._id = identity.generate();
                person.addParent(parent2);

                var document = serializer.write(person);

                var start = process.hrtime();

                for(var i = 0; i < 10000; i++) {
                    var obj = personMapping.read(document, undefined, []);
                }

                // divide by a million to get nano to milli
                var elapsed = process.hrtime(start);
                console.log("loaded " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

                done();
            });
        });*/
    });
});
