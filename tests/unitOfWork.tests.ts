/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;

import UnitOfWork = require("../src/unitOfWork");
import Configuration = require("../src/config/configuration");

describe('UnitOfWork', () => {

    it('', (done) => {

        var config = new Configuration({ uri: "mongodb://localhost:27017/artifact" });
        config.addDeclarationFile("build/tests/fixtures/model.d.json");
        config.createSessionFactory((err, sessionFactory) => {

            var session = sessionFactory.createSession();
            done();
        });

    });
});