/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import Configuration = require("../src/config/configuration");
import InternalSession = require("../src/internalSession");
import InternalSessionFactory = require("../src/internalSessionFactory");
import EntityPersister = require("../src/entityPersister");
import PropertyFlags = require("../src/mapping/propertyFlags");
import model = require("./fixtures/model");

describe('EntityPersisterTests', () => {

    it('performance test', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: InternalSessionFactory) => {
            if (err) throw err;

            var persons: model.Person[] = [];

            for(var i = 0; i < 10000; i++) {

                var person = new model.Person(new model.PersonName("Jones", "Bob"));

                person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];

                for(var j = 0; j < 100; j++) {
                    var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
                    person.addParent(parent1);
                }

                persons.push(person);
            }


            var persister = sessionFactory.getPersisterForObject(person);
            var session = <InternalSession>sessionFactory.createSession();
            var start = process.hrtime();

            async.each(persons, (item: model.Person, done: (err?: Error) => void) => {
                persister.getReferencedEntities(session, person, PropertyFlags.CascadeAll, (err: Error, results: any[]) => {
                    if(err) return done(err);

                    done();
                });
            }, err => {
                if(err) return done(err);
                var elapsed = process.hrtime(start);
                console.log("Walked " + i + " entities in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
                done();
            });
        });
    });
});