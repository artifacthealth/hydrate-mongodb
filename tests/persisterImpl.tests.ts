/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import PersisterImpl = require("../src/persisterImpl");
import model = require("./fixtures/model");
import SessionImpl = require("../src/sessionImpl");
import MockSessionFactory = require("./mockSessionFactory");
import MockCollection = require("./driver/mockCollection");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import EntityMapping = require("../src/mapping/entityMapping");
import MockIdentityGenerator = require("./id/mockIdentityGenerator");

describe('PersisterImpl', () => {

    describe('findOneById', () => {

        it.skip('', (done) => {
            var factory = new MockSessionFactory();
            var registry = new MappingRegistry();
            factory.mapping = new EntityMapping(registry);
            factory.mapping.identity = new MockIdentityGenerator();
            factory.mapping.classConstructor = model.Address;
            registry.addMapping(factory.mapping);

            var session = new SessionImpl(factory);
            var collection = new MockCollection();
            var persister = new PersisterImpl(session, factory.mapping, collection);

            persister.findOneById(1, (err, entity) => {
                if(err) return done(err);
                done();
            });
            persister.findOneById(1, (err, entity) => {
                if(err) return done(err);
                done();
            });
        });
    });
});