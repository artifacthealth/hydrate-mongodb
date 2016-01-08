/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";

import {SetMapping} from "../../src/mapping/setMapping";
import {EntityMapping} from "../../src/mapping/entityMapping";
import {ObjectIdGenerator} from "../../src/id/objectIdGenerator";
import {ReadContext} from "../../src/mapping/readContext";
import {NumberMapping} from "../../src/mapping/numberMapping";
import {MappingError} from "../../src/mapping/mappingError";
import {MappingRegistry} from "../../src/mapping/mappingRegistry";
import {MockSessionFactory} from "../mockSessionFactory";
import {Property} from "../../src/mapping/property";
import {Reference} from "../../src/reference";

describe('SetMapping', () => {

    describe('read', () => {

        it('passes through null values in array', () => {

            var mapping = createMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [null]);

            assertEqual(result, new Set([null]));
        });

        it('transforms undefined values to null values', () => {

            var mapping = createMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [undefined]);

            assertEqual(result, new Set([null]));
        });

        it('converts array to Set and drops duplicates', () => {

            var mapping = createMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [1, 1, 2, 2, 10, 12]);
            assertEqual(result, new Set([1, 2, 10, 12]));
        });
    });

    describe('write', () => {

        it('converts Set to array in document', () => {

            var mapping = createMapping();

            var errors: MappingError[] = [];
            var result = mapping.write(new Set([1, 2, 10, 12]), "", errors, []);
            assert.deepEqual(errors, []);
            assert.deepEqual(result, [1, 2, 10, 12]);
        });
    });

    describe('fetch', () => {

        it('retrieves references in set', (done) => {

            // setup mapping registry
            var mapping = createEntityMapping();
            var registry = new MappingRegistry();
            var setMapping = <SetMapping>mapping.getProperty("a").mapping;
            var elementMapping = <EntityMapping>setMapping.elementMapping;
            registry.addMappings([mapping, elementMapping]);

            // create fetched entity
            var generator = new ObjectIdGenerator();
            var entityId = generator.generate();
            var entity = new B();

            // create factory and session
            var factory = new MockSessionFactory(registry);
            var session = factory.createSession();

            var fetchCalled = 0;

            // setup persister to handle onFindOneById call
            var persister = factory.getPersisterForConstructor(session, B);
            persister.onFindOneById = (id, callback) => {
                process.nextTick(() => {
                    assert.equal(id, entityId);
                    fetchCalled++;
                    callback(null, entity);
                });
            }

            setMapping.fetch(session, null, new Set([new Reference(elementMapping, entityId)]), [], 0, (err, result) => {
                assert.equal(fetchCalled, 1);
                assert.equal(result.size, 1);
                assert.instanceOf(result, Set);
                assert.ok(result.has(entity));
                done();
            });
        });
    });
});

function assertEqual(actual: Set<any>, expected: Set<any>, message?: string): void {

    assert.deepEqual(toArray(actual), toArray(expected), message);
}

function toArray<T>(value: Set<T>): T[] {

    if(!value) return <any>value;

    var result: T[] = [];

    value.forEach((item) => result.push((item)));

    return result;
}

function createMapping(): SetMapping {

    return new SetMapping(new NumberMapping());
}

function createEntityMapping(): EntityMapping {

    var elementMapping = new EntityMapping();
    elementMapping.name = "B";
    elementMapping.inheritanceRoot = elementMapping;
    elementMapping.classConstructor = B;

    var setMapping = new SetMapping(elementMapping);

    var entityMapping = new EntityMapping();
    entityMapping.name = "A";
    entityMapping.inheritanceRoot = entityMapping;
    entityMapping.classConstructor = A;
    var property = new Property("a", setMapping);
    property.field = "a";
    entityMapping.addProperty(property);

    return entityMapping;
}

class A {

}

class B {

}