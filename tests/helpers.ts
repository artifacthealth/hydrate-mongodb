/// <reference path="../typings/tsreflect.d.ts"/>

import reflect = require("tsreflect");
import Map = require("../src/core/map");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import Configuration = require("../src/config/configuration");
import ObjectIdGenerator = require("../src/id/objectIdGenerator");
import PersisterImpl = require("../src/persisterImpl");
import MockCollection = require("./driver/mockCollection");
import MockSessionFactory = require("./mockSessionFactory");
import model = require("./fixtures/model");
import Mapping = require("../src/mapping/mapping");
import ClassMapping = require("../src/mapping/classMapping");

var fixtureDir = "tests/fixtures/";

export function referenceFixture(filename: string): void {

    reflect.reference(fixtureDir + filename);
}

export function requireFixture(filename: string): reflect.Symbol {

    return reflect.require(fixtureDir + filename);
}

var registryCache: Map<MappingRegistry> = {};

export function createFactory(file: string, callback: (err: Error, result?: MockSessionFactory) => void): void {

    var registry = registryCache[file];
    if(registry) {
        return callback(null, new MockSessionFactory(registry));
    }

    var provider = new AnnotationMappingProvider();
    provider.addFile("build/tests/fixtures/" + file + ".d.json");
    provider.getMapping(new Configuration(), (err, mappings) => {
        if(err) return callback(err);

        var registry = new MappingRegistry();
        registry.addMappings(<ClassMapping[]>mappings);

        registryCache[file] = registry; // cache result

        callback(null, new MockSessionFactory(registry));
    });
}

var generator = new ObjectIdGenerator();

export function generateId(): any {
    return generator.generate();
}

export function createPerson(): model.Person {
    var person = new model.Person(new model.PersonName("Jones", "Bob"));
    (<any>person)._id = generateId();
    return person;
}

export function createPersister(collection: MockCollection, callback: (err: Error, persister?: PersisterImpl) => void): void;
export function createPersister(collection: MockCollection, ctr: Function, callback: (err: Error, persister?: PersisterImpl) => void): void;
export function createPersister(collection: MockCollection, ctrOrCallback: any, callback?: (err: Error, persister?: PersisterImpl) => void): void {

    var ctr: any;

    if(arguments.length == 2) {
        callback = ctrOrCallback;
        ctr = model.Person;
    }
    else {
        ctr = ctrOrCallback;
    }

    createFactory("model", (err, factory) => {
        if (err) return callback(err);
        var session = factory.createSession();
        callback(null, new PersisterImpl(session, factory.getMappingForConstructor(ctr), collection));
    });
}
