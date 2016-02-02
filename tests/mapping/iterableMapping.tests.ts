/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";

import {IterableMapping} from "../../src/mapping/iterableMapping";
import {EntityMapping} from "../../src/mapping/entityMapping";
import {ObjectIdGenerator} from "../../src/id/objectIdGenerator";
import {ReadContext} from "../../src/mapping/readContext";
import {NumberMapping} from "../../src/mapping/numberMapping";
import {MappingError} from "../../src/mapping/mappingError";
import {MappingRegistry} from "../../src/mapping/mappingRegistry";
import {MockSessionFactory} from "../mockSessionFactory";
import {Property} from "../../src/mapping/property";
import {Reference} from "../../src/reference";
import {WriteContext} from "../../src/mapping/writeContext";

describe('IterableMapping', () => {

    describe('read', () => {

        it('passes through null values in array', () => {

            var mapping = createSetMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [null]);

            assertIterablesEqual(result, new Set([null]));
        });

        it('transforms undefined values to null values', () => {

            var mapping = createSetMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [undefined]);

            assertIterablesEqual(result, new Set([null]));
        });

        it('converts array to iterable', () => {

            var mapping = createSetMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [1, 1, 2, 2, 10, 12]);
            assertIterablesEqual(result, new Set([1, 2, 10, 12]));
        });

        it('preserves order', () => {

            var mapping = createCustomIterableMapping();
            var context = new ReadContext(null);

            var result = mapping.read(context, [1, 1, 2, 2, 10, 12]);
            assertIterablesEqual(result, [1, 1, 2, 2, 10, 12]);
        });
    });

    describe('write', () => {

        it('converts iterable to array in document', () => {

            var mapping = createSetMapping();

            var context = new WriteContext();
            var result = mapping.write(context, new Set([1, 2, 10, 12]));
            if(context.hasErrors) {
                throw new Error(context.getErrorMessage());
            }
            assert.deepEqual(result, [1, 2, 10, 12]);
        });
    });

    describe('fetch', () => {

        it('retrieves references in iterable', (done) => {

            // setup mapping registry
            var mapping = createEntityMapping();
            var registry = new MappingRegistry();
            var setMapping = <IterableMapping>mapping.getProperty("a").mapping;
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

function assertIterablesEqual<T>(actual: Iterable<T>, expected: Iterable<T>, message?: string): void {

    assert.deepEqual(toArray(actual), toArray(expected), message);
}

class A {

}

class B {

}

class CustomIterable implements Iterable<number>{

    private _arr: any[];

    constructor(iterable: any[]) {

        this._arr = toArray(iterable);
    }

    [Symbol.iterator](): Iterator<any> {

        var nextIndex = 0;

        return {
            next: () => {
                return nextIndex < this._arr.length ?
                {value: this._arr[nextIndex++], done: false} :
                {done: true};
            }
        }
    }
}

function createSetMapping(): IterableMapping {

    return new IterableMapping(Set, new NumberMapping());
}

function createCustomIterableMapping(): IterableMapping {

    return new IterableMapping(CustomIterable, new NumberMapping());
}

function createEntityMapping(): EntityMapping {

    var elementMapping = new EntityMapping();
    elementMapping.name = "B";
    elementMapping.inheritanceRoot = elementMapping;
    elementMapping.classConstructor = B;

    var setMapping = new IterableMapping(Set, elementMapping);

    var entityMapping = new EntityMapping();
    entityMapping.name = "A";
    entityMapping.inheritanceRoot = entityMapping;
    entityMapping.classConstructor = A;
    var property = new Property("a", setMapping);
    property.field = "a";
    entityMapping.addProperty(property);

    return entityMapping;
}

function toArray<T>(value: Iterable<T>): T[] {

    if(!value) return [];

    var result: T[] = [];

    for(let item of value) {
        result.push(item);
    }

    return result;
}