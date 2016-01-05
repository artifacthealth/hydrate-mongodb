import * as model from "./fixtures/model";
import {Lookup} from "../src/core/lookup";
import {AnnotationMappingProvider} from "../src/mapping/providers/annotationMappingProvider";
import {MappingRegistry} from "../src/mapping/mappingRegistry";
import {Configuration} from "../src/config/configuration";
import {ObjectIdGenerator} from "../src/id/objectIdGenerator";
import {PersisterImpl} from "../src/persisterImpl";
import {MockCollection} from "./driver/mockCollection";
import {MockSessionFactory} from "./mockSessionFactory";
import {Mapping} from "../src/mapping/mapping";
import {ClassMapping} from "../src/mapping/classMapping";

var registryCache: Lookup<MappingRegistry> = {};

export function createFactory(files: string, callback: (err: Error, result?: MockSessionFactory) => void): void;
export function createFactory(files: string[], callback: (err: Error, result?: MockSessionFactory) => void): void;
export function createFactory(files: any, callback: (err: Error, result?: MockSessionFactory) => void): void {

    var key: string;

    if(!Array.isArray((files))) {
        files = [files];
    }

    key = files.join(",");

    var registry = registryCache[key];
    if(registry) {
        return callback(null, new MockSessionFactory(registry));
    }

    var provider = new AnnotationMappingProvider();

    files.forEach((file: string) => provider.addFile("build/tests/fixtures/" + file + ".js"));

    var config = new Configuration();

    provider.getMapping(config, (err, mappings) => {
        if(err) return callback(err);

        var registry = new MappingRegistry();
        registry.addMappings(<ClassMapping[]>mappings);

        registryCache[key] = registry; // cache result

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
        factory.getMappingForConstructor(ctr, (err, mapping) => {
            if(err) return callback(err);

            callback(null, new PersisterImpl(session, mapping, collection));
        });
    });
}
