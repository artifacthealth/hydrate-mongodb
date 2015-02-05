/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;
import helpers = require("./helpers");

// Fixtures
import model = require("./fixtures/model");

describe('Query', () => {

    describe('count', () => {

        it('returns the number of items that match the specified criteria', (done) => {

            helpers.createFactory("model", (err, factory) => {
                if (err) return done(err);

                var session = factory.createSession();
                var persister = factory.getPersisterForConstructor(session, model.Person);
                persister.onCount = (criteria, limit, skip, callback) => {
                    callback(null, 10);
                }

                session.query(model.Person).count({ name: 'Bob' }, (err, count) => {
                    if(err) return done(err);

                    assert.equal(count, 10);
                    done();
                });
            });
        });
    });
});