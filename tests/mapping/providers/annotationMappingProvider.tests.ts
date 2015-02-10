/// <reference path="../../../typings/mocha.d.ts"/>
/// <reference path="../../../typings/chai.d.ts"/>
/// <reference path="../../../typings/tsreflect.d.ts"/>

import chai = require("chai");
import assert = chai.assert;
import reflect = require("tsreflect");
import AnnotationMappingProvider = require("../../../src/mapping/providers/annotationMappingProvider");
import Configuration = require("../../../src/config/Configuration");
import MappingRegistry = require("../../../src/mapping/mappingRegistry");

import Mapping = require("../../../src/mapping/mapping");
import ClassMapping = require("../../../src/mapping/classMapping");
import EntityMapping = require("../../../src/mapping/entityMapping");

describe('AnnotationMappingProvider', () => {

    describe('when processing annotation', () => {

        describe('@collection', () => {

            it('correctly load arguments', (done) => {

                processFixture("collection", done, (results) => {

                    assert.lengthOf(results, 4);
                    assert.equal(findMapping(results, "B").collectionName, "someCollection");
                    var mappingC = findMapping(results, "C");
                    assert.equal(mappingC.collectionName, "C");
                    assert.equal(mappingC.databaseName, "someDatabase");
                    var mappingD = findMapping(results, "D");
                    assert.equal(mappingD.collectionName, "someCollection");
                    assert.equal(mappingD.databaseName, "someDatabase");
                });
            });

            it("maps all subclasses of class annotated with 'collection' as document type", (done) => {

                processFixture("collectionHierarchy", done, (results) => {

                    assert.lengthOf(results, 3);
                    results.forEach(x => assert.instanceOf(x, EntityMapping));
                });
            });

            it("throws error if there is more than one 'collection' annotation in a class hierarchy", (done) => {

                processFixture("collectionMultiple", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Only one class per inheritance hierarchy can have the 'collection' or 'embeddable' annotation");
                    done();
                });
            });

            it('sets the collectionName to the type name if the collection name is not specified', (done) => {

                processFixture("collection", done, (results) => {

                    assert.equal(findMapping(results, "A").collectionName, "A");
                });
            });
        });

        describe('@index', () => {

            it('adds index defined on subclass to root type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingA = findMapping(results, "A");
                    assert.equal(findMapping(results, "B").indexes, undefined);
                    assert.lengthOf(mappingA.indexes, 3);
                });
            });

            it('adds index defined on class property to root type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingD = findMapping(results, "D");
                    assert.lengthOf(mappingD.indexes, 3);

                    assert.deepEqual(mappingD.indexes[0].keys, [['a', 1]]);
                    assert.deepEqual(mappingD.indexes[1].keys, [['g', -1]]);
                    assert.isTrue(mappingD.indexes[2].options.dropDups);
                });
            });
        });

        describe('@discriminatorField', () => {

            it('sets discriminatorField to specified value', (done) => {

                processFixture("discriminatorField", done, (results) => {

                    assert.equal(findMapping(results, "Animal").discriminatorField, "type");
                });
            });
        });

        describe('@discriminatorValue', () => {

            it('sets discriminatorValue to specified value', (done) => {

                processFixture("discriminatorField", done, (results) => {

                    assert.equal(findMapping(results, "Cat").discriminatorValue, "C");
                    assert.equal(findMapping(results, "Dog").discriminatorValue, "D");
                });
            });

            it('sets the discriminatorValue to the class name if the discriminatorValue is not set for a document subclass', (done) => {

                processFixture("collectionHierarchy", done, (results) => {

                    assert.equal(findMapping(results, "C").discriminatorValue, "C");
                });
            });

            it("throws error if duplicate discriminatorValue in a class hierarchy", (done) => {

                processFixture("discriminatorValueDuplicate", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "There is already a class in this inheritance hierarchy with a discriminator value of");
                    done();
                });
            });
        });

        describe("@cascade", () => {

            // There was a bug where switch was missing break and @cascade fell through to @field, setting the name of the field
            it("does not affect the name of the field", (done) => {

                processFixture("cascade", done, (results) => {

                    var mapping = findMapping(results, "A");
                    assert.equal(mapping.getProperty("b").field, "b");
                });
            });
        });

        describe('@field', () => {
            it("sets field name if specified", (done) => {

                processFixture("field", done, (results) => {

                    var mapping = findMapping(results, "A");
                    assert.equal(mapping.getProperty("b").field, "a");
                    assert.equal(mapping.getProperty("d").field, "someName");
                });
            });

            it("sets field name to property name if field name is not specified", (done) => {

                processFixture("field", done, (results) => {

                    assert.equal(findMapping(results, "A").getProperty("c").field, "c");
                });
            });

            it("throws error if more than one property has the same field name", (done) => {

                processFixture("fieldDuplicate", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "There is already a mapped property for field");
                    done();
                });
            });
        });
    });
});

function findMapping(mappings: EntityMapping[], name: string): EntityMapping {

    for(var i = 0, l = mappings.length; i < l; i++) {
        var mapping = mappings[i];
        if(mapping.name === name) {
            return mapping;
        }
    }
}

function processFixture(file: string, done: (err?: Error) => void, callback?: (results: EntityMapping[]) => void): void {

    var provider = new AnnotationMappingProvider(new Configuration());
    provider.addFile("build/tests/fixtures/annotations/" + file + ".d.json");
    provider.getMapping((err, registry) => {
        if(err) return done(err);

        if(callback) {
            callback(<EntityMapping[]>registry.getMappings());
        }
        done();
    });
}