/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;
import helpers = require("./helpers");
import model = require("./fixtures/model");
import MongoDriver = require("../src/driver/mongoDriver");

import MappingRegistry = require("../src/mapping/mappingRegistry");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import DocumentBuilder = require("../src/documentBuilder");
import Configuration = require("../src/config/configuration");

describe('DocumentBuilder', () => {

    describe('buildDocument', () => {

        it('', (done) => {

            createDocumentBuilder((err, builder) => {
                if(err) return done(err);

                var fixture = helpers.requireFixture("model");
                var generator = new MongoDriver().defaultIdentityGenerator();

                var person = new model.Person(new model.PersonName("Jones", "Bob"));
                person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];
                (<any>person)._id = generator.generate();
                person.addAttribute("eye color", "hazel");
                person.addAttribute("hair color", "brown");
                person.addAttribute("temperament", "angry");

                var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                (<any>parent1)._id = generator.generate();
                person.addParent(parent1);

                var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
                (<any>parent2)._id = generator.generate();
                person.addParent(parent2);

                var ret = builder.buildDocument(person, fixture.resolve("Person").getDeclaredType());
                done();
            });
        });
    });
});

function createDocumentBuilder(callback: (err: Error, builder:  DocumentBuilder) => void): void {

    var mappingProvider = new AnnotationMappingProvider(new Configuration());
    mappingProvider.addFile("build/tests/fixtures/model.d.json");
    mappingProvider.getMapping((err, mappings) => {
        if (err) return callback(err, null);

        var mappingRegistry = new MappingRegistry(mappings);
        var documentBuilder = new DocumentBuilder(mappingRegistry);

        callback(null, documentBuilder);
    });
}