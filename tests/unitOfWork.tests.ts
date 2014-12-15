/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;

import UnitOfWork = require("../src/unitOfWork");
import Configuration = require("../src/config/configuration");
import Session = require("../src/session");
import model = require("./fixtures/model");

describe('UnitOfWork', () => {

    it('', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err, sessionFactory) => {
            if(err) throw err;

            var session = sessionFactory.createSession();

            var person = new model.Person(new model.PersonName("Jones", "Bob"));
            person.phones = [ new model.Phone("303-258-1111", model.PhoneType.Work) ];

            var parent1 = new model.Person(new model.PersonName("Jones", "Mary"));
            person.addParent(parent1);

            var parent2 = new model.Person(new model.PersonName("Jones", "Jack"));
            person.addParent(parent2);

            session.persist(person);
            session.persist(parent1);
            session.persist(parent2);
            session.flush(done);
        });
    });

    it('', () => {

        var list: { a: number; b: number }[] = [];
        for(var i = 0; i < 100000; i++) {
            list[i] = {
                a: Math.floor(Math.random() * 100000),
                b: Math.floor(Math.random() * 3)
            }
        }

        /* 3 loops */
        count0 = count1 = count2 = 0;
        var start = process.hrtime();

        for(var i = 0, l = list.length; i < l; i++) {
            var item = list[i];
            if(item.b == 0) {
                method0(item.a);
            }
        }

        for(var i = 0, l = list.length; i < l; i++) {
            var item = list[i];
            if(item.b == 1) {
                method1(item.a);
            }
        }

        for(var i = 0, l = list.length; i < l; i++) {
            var item = list[i];
            if(item.b == 2) {
                method2(item.a);
            }
        }

        var elapsed = process.hrtime(start);
        console.log("3 loops: " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
        console.log(count0, count1, count2);

        /* Sorting */
        count0 = count1 = count2 = 0;
        var start = process.hrtime();

        list.sort(compare);
        for(var i = 0, l = list.length; i < l; i++) {
            var item = list[i];

            switch(item.b) {
                case 0:
                    method0(item.a);
                    break;
                case 1:
                    method1(item.a);
                    break;
                case 2:
                    method2(item.a);
                    break;
            }
        }

        var elapsed = process.hrtime(start);
        console.log("Sorting and case: " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
        console.log(count0, count1, count2);
    });


});

function compare (a: { a: number; b: number }, b: { a: number; b: number }): number {

    return a.a != b.a ? a.a - b.a :  a.b - b.b;
}

var count0: number;

function method0(a: number): void {
    count0++;
}

var count1: number;

function method1(a: number): void {
    count1++;
}

var count2: number;

function method2(a: number): void {
    count2++;
}