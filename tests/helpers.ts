/// <reference path="../typings/lib.core.es6.d.ts" />
/// <reference path="../typings/intl.d.ts" />
/// <reference path="../typings/console.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/glob.d.ts" />
/// <reference path="../typings/async.d.ts" />

import * as model from "./fixtures/model";
import * as path from "path";
import * as async from "async";
import {AnnotationMappingProvider} from "../src/mapping/providers/annotationMappingProvider";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {Configuration} from "../src/config/configuration";
import {ObjectIdGenerator} from "../src/id/objectIdGenerator";
import {PersisterImpl} from "../src/persisterImpl";
import {MockCollection} from "./driver/mockCollection";
import {MockSessionFactory} from "./mockSessionFactory";
import {MappingModel} from "../src/mapping/mappingModel";
import {ClassMapping} from "../src/mapping/classMapping";
import {absolutePath, hasExtension} from "../src/core/fileUtil";
import {ResultCallback} from "../src/core/resultCallback";

var glob = require("glob");

var registryCache: Map<string, MappingRegistry> = new Map();

export function createFactory(files: string, callback: (err: Error, result?: MockSessionFactory) => void): void;
export function createFactory(files: string[], callback: (err: Error, result?: MockSessionFactory) => void): void;
export function createFactory(files: any, callback: (err: Error, result?: MockSessionFactory) => void): void {

    var key: string;

    if(!Array.isArray((files))) {
        files = [files];
    }

    key = files.join(",");

    var registry = registryCache.get(key);
    if(registry) {
        return callback(null, new MockSessionFactory(registry));
    }

    var config = new Configuration();
    var provider = new AnnotationMappingProvider();

    requireFiles(files.map((file: string) => "build/tests/fixtures/" + file + ".js"), (err, modules) => {
        if(err) return callback(err);

        provider.addModules(modules);

        provider.getMapping(config, (err, mappings) => {
            if(err) return callback(err);

            var registry = new MappingRegistry();
            registry.addMappings(<ClassMapping[]>mappings);

            registryCache.set(key, registry); // cache result

            callback(null, new MockSessionFactory(registry));
        });
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


export function requireFiles(filePaths: string[], callback: ResultCallback<Object[]>): void {

    var modules: Object[] = [];

    async.each(filePaths, (filePath, done) => {
        var relativePath = path.relative(process.cwd(), filePath);
        glob(relativePath, (err: Error, matches: string[]) => {
            if (err) return callback(err);

            // If there were not any matches then filePath was probably a path to a single file
            // without an extension. Pass in the original path and let _processExports figure
            // it out.
            if (!matches || matches.length == 0) {
                matches = [relativePath];
            }

            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];
                if (hasExtension(match, ".js")) {
                    modules.push(require(absolutePath(match)));
                }
            }

            done();
        });
    }, (err) => {
        if(err) return callback(err);
        callback(null, modules);
    });
}
