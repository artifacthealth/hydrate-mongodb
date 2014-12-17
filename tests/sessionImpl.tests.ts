/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import Configuration = require("../src/config/configuration");
import SessionFactory = require("../src/sessionFactory");
import model = require("./fixtures/model");

describe('SessionImpl', () => {

    it.skip('', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if (err) return done(err);

            var session = sessionFactory.createSession();
            session.find(model.Person, "548e31e7a4258d6f07b14e47", (err, person) => {
                if(err) return done(err);
                done();
            });
        });
    });

    it('persist', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if(err) throw err;

            var session = sessionFactory.createSession();

            var people: model.Person[] = [];

            for(var i = 0; i < 1000; i++) {
                people.push(new model.Person(new model.PersonName("Jones" + i, "Bob")))
            }

            var persistStart = process.hrtime();
            async.each(people, (person: model.Person, done: (err?: Error) => void) => {
                session.save(person, done);
            }, (err) => {
                if(err) return done(err);
                var persistEnd = process.hrtime(persistStart);
                var flushStart = process.hrtime();
                session.flush(() => {
                    var flushEnd = process.hrtime(flushStart);
                    console.log("persist time: " + persistEnd[0] + "s, " + (persistEnd[1]/1000000).toFixed(3) + "ms");
                    console.log("flush time: " + flushEnd[0] + "s, " + (flushEnd[1]/1000000).toFixed(3) + "ms");
                    done();
                });
            });
        });
    });


    it.skip('cascade', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if(err) throw err;

            var session = sessionFactory.createSession();

            var person = new model.Person(new model.PersonName("Jones", "Bob"));
            person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];

            var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
            person.addParent(parent1);

            var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
            person.addParent(parent2);

            session.save(person, err => {
                session.flush(err => {
                    if(err) return done(err);

                    session.remove(person, err => {
                        if(err) return done(err);

                        session.flush(err => {
                            if(err) return done(err);
                            done();
                        });
                    });
                });
            });
        });
    });

});
