/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import Configuration = require("../src/config/configuration");
import SessionFactory = require("../src/sessionFactory");
import SessionImpl = require("../src/sessionImpl");
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

    it.skip('save', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err: Error, sessionFactory: SessionFactory) => {
            if(err) throw err;

            var session = <SessionImpl>sessionFactory.createSession();

            for(var i = 0; i < 1000; i++) {
                session.save(new model.Person(new model.PersonName("Jones" + i, "Bob")));
            }

            session.flush(done);
        });
    });

    it('cascade', (done) => {

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

            session.save(person);
            session.flush(() => {

                person.birthDate = new Date("08/18/1977");
                session.flush(done);
            });
        });
    });

});
