/// <reference path="../../../typings/mocha.d.ts"/>
/// <reference path="../../../typings/chai.d.ts"/>

import {assert} from "chai";
import {AnnotationMappingProvider} from "../../../src/mapping/providers/annotationMappingProvider";
import {Configuration} from "../../../src/config/Configuration";
import {MappingRegistry} from "../../../src/mapping/mappingRegistry";
import {MappingFlags} from "../../../src/mapping/mappingFlags";
import {EnumMapping} from "../../../src/mapping/enumMapping";
import {ClassMapping} from "../../../src/mapping/classMapping";
import {EntityMapping} from "../../../src/mapping/entityMapping";
import {EnumType} from "../../../src/mapping/enumType";
import {PropertyConverter} from "../../../src/mapping/propertyConverter";
import * as ConverterFixture from "../../fixtures/annotations/converter";
import * as ConverterOnClassFixture from "../../fixtures/annotations/converterOnClass";

describe('AnnotationMappingProvider', () => {

    describe('getMapping', () => {

        it('correctly creates BufferMapping for a Buffer', (done) => {

            processFixture("classWithBuffer", done, (results) => {

                assert.lengthOf(results, 1);
                var classMapping = findMapping(results, "ClassWithBuffer");
                var property = classMapping.getProperty("data");
                assert.isTrue(property != null, "Could not find property 'data'");
                assert.isTrue((property.mapping.flags & MappingFlags.Buffer) === MappingFlags.Buffer);
            });
        });
    });

    describe('when processing annotation', () => {

        describe('@entity', () => {

            it("maps all subclasses of class annotated with 'entity' as document type", (done) => {

                processFixture("entityHierarchy", done, (results) => {

                    assert.lengthOf(results, 3);
                    results.forEach(x => assert.instanceOf(x, EntityMapping));
                });
            });

            it("throws error if there is more than one 'entity' annotation in a class hierarchy", (done) => {

                processFixture("entityMultiple", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Only one class per inheritance hierarchy can have the @Entity or @Embeddable annotation");
                    done();
                });
            });

            it("entity mappings can share a common base class", (done) => {

                processFixture("sharedBaseClass", done, (results) => {

                    assert.lengthOf(results, 2);
                    results.forEach(x => assert.instanceOf(x, EntityMapping));

                    // validate we still inherited base class properties
                    assert.equal(findMapping(results, "B").getProperty("a").field, "a");
                    assert.equal(findMapping(results, "B").getProperty("b").field, "b");
                    assert.equal(findMapping(results, "C").getProperty("a").field, "a");
                    assert.equal(findMapping(results, "C").getProperty("c").field, "c");
                });
            });
        });

        describe('@enumerated', () => {

            it("sets enum type to String", (done) => {

                processFixture("enumerated", done, (results) => {

                    var classMapping = findMapping(results, "A");
                    var enumMapping = <EnumMapping>classMapping.getProperty("e1").mapping;
                    assert.equal(enumMapping.type, EnumType.String);
                });
            });

            it("correctly sets enum members", (done) => {

                processFixture("enumerated", done, (results) => {

                    var classMapping = findMapping(results, "A");
                    var enumMapping = <EnumMapping>classMapping.getProperty("e1").mapping;

                    assert.equal(enumMapping.members["value0"], 0);
                    assert.equal(enumMapping.members["value1"], 1);
                    assert.equal(enumMapping.members["value2"], 2);
                });
            });
        });

        describe('@collection', () => {

            it('correctly load arguments', (done) => {

                processFixture("collection", done, (results) => {

                    assert.lengthOf(results, 4);
                    assert.equal(findMapping(results, "B").collectionName, "someCollection");
                    var mappingC = findMapping(results, "C");
                    assert.equal(mappingC.collectionName, "c");
                    assert.equal(mappingC.databaseName, "someDatabase");
                    var mappingD = findMapping(results, "D");
                    assert.equal(mappingD.collectionName, "someCollection");
                    assert.equal(mappingD.databaseName, "someDatabase");
                });
            });

            it('sets the collectionName to the type name if the collection name is not specified', (done) => {

                processFixture("collection", done, (results) => {

                    assert.equal(findMapping(results, "A").collectionName, "a");
                });
            });
        });

        describe('@index', () => {

            it('adds index defined on subclass to root type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingA = findMapping(results, "A");
                    var mappingB = findMapping(results, "B");
                    assert.equal(mappingB.indexes, undefined);
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

                processFixture("entityHierarchy", done, (results) => {

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

        describe('@referenceMany', () => {

            it("throws error if target is not an entity", (done) => {

                processFixture("referenceManyWrongTarget", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Target of @ReferenceMany annotation must be an Entity");
                    done();
                });
            });
        });

        describe('@embedMany', () => {

            it("throws error if target is not a built-in type or embeddable", (done) => {

                processFixture("embedManyWrongTarget", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Target of @EmbedMany annotation must be a built-in type or an class annotated with @Embeddable");
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

        describe('@converter', () => {
            it("sets the mapping for the property to a ConverterMapping with the correct named converter", (done) => {

                var config = new Configuration();

                var converter = new MyEnumConverter();
                config.propertyConverters["MyEnumConverter"] = converter;

                processFixtureWithConfiguration("converter", config, done, (results) => {

                    var mapping = findMapping(results, "B");
                    assert.equal((<any>mapping.getProperty("a").mapping).converter, converter);
                });
            });

            it("sets the mapping for the property to a ConverterMapping with the specified converter instance", (done) => {

                var config = new Configuration();

                var converter = new MyEnumConverter();
                config.propertyConverters["MyEnumConverter"] = converter;

                processFixtureWithConfiguration("converter", config, done, (results) => {

                    var mapping = findMapping(results, "B");
                    assert.equal((<any>mapping.getProperty("b").mapping).converter.constructor.name, "SomeConverter");
                });
            });

            it("causes types of property to be ignored when building type mappings", (done) => {

                var config = new Configuration();

                var converter = new PointConverter();
                config.propertyConverters["PointConverter"] = converter;

                processFixtureWithConfiguration("converterOnClass", config, done, (results) => {

                    var mapping = findMapping(results, "B");
                    assert.equal((<any>mapping.getProperty("a").mapping).converter, converter);
                });
            });

            it("throws error if the converter is not known", (done) => {

                processFixture("unknownConverter", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Unknown converter 'Blah'");
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

    throw new Error("Could not find mapping with name '" + name + "'.");
}

function processFixture(file: string, done: (err?: Error) => void, callback?: (results: EntityMapping[]) => void): void {

    processFixtureWithConfiguration(file, new Configuration(), done, callback);
}

function processFixtureWithConfiguration(file: string, config: Configuration, done: (err?: Error) => void, callback?: (results: EntityMapping[]) => void): void {

    var provider = new AnnotationMappingProvider();
    provider.addFile("build/tests/fixtures/annotations/" + file + ".js");
    provider.getMapping(config, (err, mappings) => {
        if(err) return done(err);

        if(callback) {
            callback(<EntityMapping[]>mappings.filter((x) => (x.flags & MappingFlags.Entity) !== 0));
        }
        done();
    });
}

class MyEnumConverter implements PropertyConverter {

    convertToDocumentField(property: any): any {

        switch(property) {
            case ConverterFixture.B:
                return "B";
        }
    }

    convertToObjectProperty(field: any): any {

        switch(field) {
            case "B":
                return ConverterFixture.B;
        }
    }
}

class PointConverter implements PropertyConverter {

    convertToDocumentField(property: any): any {

        return property.x + "," + property.y;
    }

    convertToObjectProperty(field: any): any {

        var parts = field.split('.');
        return new ConverterOnClassFixture.Point(parts[0], parts[1]);
    }
}