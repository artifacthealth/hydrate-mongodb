/// <reference path="../typings/tsreflect.d.ts"/>

import reflect = require("tsreflect");
import MockSessionFactory = require("./mockSessionFactory");
import Map = require("../src/core/map");
import AnnotationMappingProvider = require("../src/mapping/providers/annotationMappingProvider");
import MappingRegistry = require("../src/mapping/mappingRegistry");
import Configuration = require("../src/config/configuration");

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

    var provider = new AnnotationMappingProvider(new Configuration());
    provider.addFile("build/tests/fixtures/" + file + ".d.json");
    provider.getMapping((err, registry) => {
        if(err) return callback(err);

        registryCache[file] = registry; // cache result

        callback(null, new MockSessionFactory(registry));
    });
}