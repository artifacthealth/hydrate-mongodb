/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../src/core/observe.d.ts" />

import chai = require("chai");
import assert = chai.assert;

import Observer = require("../src/observer");
import Reference = require("../src/reference");
import ObjectIdGenerator = require("../src/id/objectIdGenerator");

import helpers = require("./helpers");
import model = require("./fixtures/model");

describe('Observer', () => {

    it('will call the specified callback if a watched objects change', (done) => {

        var called = 0;
        var observer = new Observer(() => {
            called++;
        });

        var obj: any = {
            name: "Bob"
        }

        observer.watch(obj);
        obj.name = "Joe";

        setTimeout(() => {
            assert.equal(called, 1, "Callback was not called");
            done();
        }, 0);
    });

    it('will call the specified callback if a watched array change in size', (done) => {

        var called = 0;
        var observer = new Observer(() => {
            called++;
        });

        var list: any[] = [];

        observer.watch(list);
        list.push("test");

        setTimeout(() => {
            assert.equal(called, 1, "Callback was not called");
            done();
        }, 0);
    });

    it('will call the specified callback if a watched array has a changed value', (done) => {

        var called = 0;
        var observer = new Observer(() => {
            called++;
        });

        var list: any[] = [ "test" ];

        observer.watch(list);
        list[0] = "a";

        setTimeout(() => {
            assert.equal(called, 1, "Callback was not called");
            done();
        }, 0);
    });

    it('stops watching the object after the object changes', (done) => {

        var called = 0;
        var observer = new Observer(() => {
            called++;
        });

        var obj: any = {
            name: "Bob"
        }

        observer.watch(obj);
        obj.name = "Joe";

        setTimeout(() => {
            assert.equal(called, 1, "Callback was not called");

            obj.name = "Jack";

            setTimeout(() => {
                assert.equal(called, 1, "Observer did not stop watching the object after the first change");
                done();
            });
        }, 0);
    });

    it('ignores change if reference is updated to equivalent entity', (done) => {

        helpers.createFactory("model", (err, factory) => {
            if(err) return done(err);

            var session = factory.createSession();

            var called = 0;
            var observer = new Observer(() => {
                called++;
            });

            var generator = new ObjectIdGenerator();
            var id = generator.generate();
            var obj: any = {
                parent: session.getReference(model.Person, id)
            }
            observer.watch(obj);

            obj.parent = {
                _id: id
            }

            setTimeout(() => {
                assert.equal(called, 0, "Callback should not have been called.");
                done();
            }, 0);
        });
    });

    it('does not ignore change if reference is updated to a non-equivalent entity', (done) => {

        helpers.createFactory("model", (err, factory) => {
            if(err) return done(err);

            var session = factory.createSession();

            var called = 0;
            var observer = new Observer(() => {
                called++;
            });

            var generator = new ObjectIdGenerator();
            var id = generator.generate();
            var obj: any = {
                parent: session.getReference(model.Person, id)
            }
            observer.watch(obj);

            obj.parent = {
                _id: generator.generate()
            }

            setTimeout(() => {
                assert.equal(called, 1, "Callback was not called");
                done();
            }, 0);
        });
    });

});