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
import Serializer = require("../../src/persister/documentSerializer");
import Configuration = require("../../src/config/configuration");

describe('DocumentSerializer', () => {

    describe('read', () => {

        it.skip('performance test', (done) => {

            var mappingProvider = new AnnotationMappingProvider(new Configuration());
            mappingProvider.addFile("build/tests/fixtures/model.d.json");
            mappingProvider.getMapping((err, mappings) => {
                if (err) return done(err);

                var fixture = helpers.requireFixture("model");
                var registry = new MappingRegistry(mappings);
                var factory = new SessionFactoryImpl({}, registry);
                var serializer = new Serializer(factory, fixture.resolve("Person").getDeclaredType());

                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];
                (<any>person)._id = 1;
                person.addAttribute("eye color", "hazel");
                person.addAttribute("hair color", "brown");
                person.addAttribute("temperament", "angry");

                var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                (<any>parent1)._id = 2;
                person.addParent(parent1);

                var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
                (<any>parent2)._id = 3;
                person.addParent(parent2);

                var document = serializer.write(person);

                var start = process.hrtime();

                for(var i = 0; i < 10000; i++) {
                    var obj = serializer.read(document);
                }

                // divide by a million to get nano to milli
                var elapsed = process.hrtime(start);
                console.log("loaded " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");

                done();
            });
        });
    });
});
