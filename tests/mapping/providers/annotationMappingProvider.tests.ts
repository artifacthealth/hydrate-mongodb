import {assert} from "chai";
import {AnnotationMappingProvider} from "../../../src/mapping/providers/annotationMappingProvider";
import {Configuration} from "../../../src/config/configuration";
import {MappingModel, FlushPriority} from "../../../src/mapping/mappingModel";
import {EnumMapping} from "../../../src/mapping/enumMapping";
import {EntityMapping} from "../../../src/mapping/entityMapping";
import {EnumType} from "../../../src/mapping/enumType";
import {PropertyConverter} from "../../../src/mapping/mappingModel";
import * as ConverterFixture from "../../fixtures/annotations/converter";
import * as CircularReferenceFixture from "../../fixtures/annotations/circularReference1";
import * as ConverterOnClassFixture from "../../fixtures/annotations/converterOnClass";
import {requireFiles, findMapping} from "../../helpers";
import {Callback} from "../../../src/core/callback";
import {Property} from "../../../src/mapping/property";

describe('AnnotationMappingProvider', () => {

    describe('getMapping', () => {

        it('correctly creates BufferMapping for a Buffer', (done) => {

            processFixture("classWithBuffer", done, (results) => {

                assert.lengthOf(results, 1);
                var classMapping = findMapping(results, "ClassWithBuffer");
                var property = classMapping.getProperty("data");
                assert.isTrue(property != null, "Could not find property 'data'");
                assert.isTrue((property.mapping.flags & MappingModel.MappingFlags.Buffer) === MappingModel.MappingFlags.Buffer);
            });
        });
    });

    describe('when processing annotation', () => {

        describe('@entity', () => {

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
                    assert.equal(mappingC.flushPriority, FlushPriority.Medium);
                    var mappingD = findMapping(results, "D");
                    assert.equal(mappingD.collectionName, "someCollection");
                    assert.equal(mappingD.databaseName, "someDatabase");
                    assert.equal(mappingD.flushPriority, FlushPriority.Low);
                });
            });

            it('sets the collectionName to the type name if the collection name is not specified', (done) => {

                processFixture("collection", done, (results) => {

                    assert.equal(findMapping(results, "A").collectionName, "a");
                });
            });

            it('adds the collectionPrefix to the collection name', (done) => {

                var config = new Configuration();

                config.collectionPrefix = "namespace.";

                processFixtureWithConfiguration("collection", config, done, (results) => {

                    assert.equal(findMapping(results, "A").collectionName, "namespace.a");
                });
            });
        });

        describe('@index', () => {

            it('adds index defined on subclass to subclass type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingA = findMapping(results, "A");
                    assert.lengthOf(mappingA.indexes, 2);
                    assert.deepEqual(mappingA.indexes[0].keys, [["a", 1], ["b", -1]]);
                    assert.deepEqual(mappingA.indexes[1].keys, [["a", 1]]);

                    var mappingB = findMapping(results, "B");
                    assert.lengthOf(mappingB.indexes, 1);
                    assert.deepEqual(mappingB.indexes[0].keys, [["c", "text"]]);
                });
            });

            it('adds index defined on class property to class type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingC = findMapping(results, "C");
                    assert.lengthOf(mappingC.indexes, 1);
                    assert.deepEqual(mappingC.indexes[0].keys, [['_id', 1],['__v', 1]]);

                    var mappingD = findMapping(results, "D");
                    assert.lengthOf(mappingD.indexes, 3);
                    assert.deepEqual(mappingD.indexes[0].keys, [['a', 1]]);
                    assert.deepEqual(mappingD.indexes[1].keys, [['g', -1]]);
                    assert.isTrue(mappingD.indexes[2].options.dropDups);
                });
            });

            it('adds index defined on mapped superclass to the entity inheritance root', (done) => {

                processFixture("index", done, (results) => {
                    var mappingF = findMapping(results, "F");
                    assert.lengthOf(mappingF.indexes, 1);
                    assert.deepEqual(mappingF.indexes[0].keys, [["e", 1]]);

                    var mappingG = findMapping(results, "G");
                    assert.lengthOf(mappingG.indexes, 1);
                    assert.deepEqual(mappingG.indexes[0].keys, [["e", 1]]);

                    var mappingH = findMapping(results, "H");
                    assert.isUndefined(mappingH.indexes);
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

        describe("@immutable", () => {

            it("throws error if class contains immutable and changetracking decorators", (done) => {

                processFixture("immutableWithChangeTracking", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Change tracking cannot be set on immutable entity.");
                    done();
                });
            });

            it("throws error if placed on a mapped superclass", (done) => {

                processFixture("immutableOnSuperclass", (err) => {
                    assert.ok(err);
                    console.log(err.message);
                    assert.include(err.message, "Error processing type 'A': Invalid annotation @Immutable: Annotation cannot be defined on a mapped superclass.");
                    done();
                });
            });

            it("sets the Immutable flag", (done) => {

                processFixture("immutable", done, (results) => {

                    var personMapping = findMapping(results, "Person");
                    assert.equal(
                        personMapping.flags & MappingModel.MappingFlags.Immutable,
                        MappingModel.MappingFlags.Immutable,
                        "Expected Immutable flag to be set on Entity `Person`.");

                    var nameMapping = personMapping.getProperty("name").mapping;
                    assert.equal(
                        nameMapping.flags & MappingModel.MappingFlags.Immutable,
                        MappingModel.MappingFlags.Immutable,
                        "Expected Immutable flag to be set on Embeddable `Name`.");
                });
            });

            it("turns off versioning", (done) => {

                processFixture("immutable", done, (results) => {

                    var personMapping = findMapping(results, "Person");
                    assert.isFalse(personMapping.versioned, "Expected versioning to be disabled.");
                });
            });
        });

        describe('@elementType', () => {

            it("can handle circular references by specifying target as class name", (done) => {

                processFixture("circularReference1", done, (results) => {

                    assert.lengthOf(results, 2);
                    results.forEach(x => assert.instanceOf(x, EntityMapping));

                    // validate that we have mappings
                    // validate that we have mappings
                    assert.equal((<any>findMapping(results, "A").getProperty("b").mapping).classConstructor, CircularReferenceFixture.B);
                    assert.equal((<any>findMapping(results, "B").getProperty("a").mapping).classConstructor, CircularReferenceFixture.A);
                });
            });

            /*
             // Disabled because emitDecoratorMetadata breaks the script when compiled with ES6
            it("throws error if target cannot be found", (done) => {

                processFixture("referenceManyCantGetType", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Unable to determine type of target");
                    done();
                });
            });
            */
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

            it("returns an error if the `id` property is mapped as a field", (done) => {

                processFixture("invalidIdField", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "The 'id' property on an entity class is automatically populated");
                    done();
                });
            });

            it("returns an error if the `_id` property is mapped as a field", (done) => {

                processFixture("invalidUnderscoreIdField", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "The '_id' property on an entity class is automatically populated");
                    done();
                });
            });

            it("sets the WriteOnly flag on the property is `readable` is `false`", (done) => {

                processFixture("fieldReadable", done, (results) => {

                    assert.isFalse(findMapping(results, "A").getProperty("a").hasFlags(MappingModel.PropertyFlags.WriteOnly));
                    assert.isTrue(findMapping(results, "A").getProperty("b").hasFlags(MappingModel.PropertyFlags.WriteOnly));
                    assert.isFalse(findMapping(results, "A").getProperty("c").hasFlags(MappingModel.PropertyFlags.WriteOnly));
                });
            });

            it("correctly sets the `nullable` flag on the property when the default for `nullable` is `false`", (done) => {

                processFixture("fieldNullable", done, (results) => {

                    assert.isFalse(findMapping(results, "A").getProperty("default").nullable);
                    assert.isFalse(findMapping(results, "A").getProperty("notNullable").nullable);
                    assert.isTrue(findMapping(results, "A").getProperty("nullable").nullable);
                });
            });

            it("correctly sets the `nullable` flag on the property when the default for `nullable` is `true`", (done) => {

                var config = new Configuration();
                config.nullable = true;

                processFixtureWithConfiguration("fieldNullable", config, done, (results) => {

                    assert.isTrue(findMapping(results, "A").getProperty("default").nullable);
                    assert.isFalse(findMapping(results, "A").getProperty("notNullable").nullable);
                    assert.isTrue(findMapping(results, "A").getProperty("nullable").nullable);
                });
            });
        });

        describe('@parent', () => {

            it("returns error if annotation is on a property in an entity", (done) => {

                processFixture("parentOnEntity", (err) => {

                    assert.ok(err);
                    assert.include(err.message, "Annotation can only be defined an embeddable class");
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

            it("sets the mapping for the property to a ConverterMapping with the specified converter constructor", (done) => {

                var config = new Configuration();

                var converter = new MyEnumConverter();
                config.propertyConverters["MyEnumConverter"] = converter;

                processFixtureWithConfiguration("converter", config, done, (results) => {

                    var mapping = findMapping(results, "B");
                    assert.equal((<any>mapping.getProperty("c").mapping).converter.constructor.name, "SomeConverter");
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

            it("when placed on a class definition, sets converter mapping for all properties referencing the class", (done) => {

                var config = new Configuration();

                var converter = new PointConverter();
                config.propertyConverters["PointConverter"] = converter;

                processFixtureWithConfiguration("converterOnClassDefinition", config, done, (results) => {

                    var mapping = findMapping(results, "B");
                    var property = mapping.getProperty("a");
                    assert.ok(property);
                    assert.equal((<any>property).mapping.converter, converter);
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

        describe('@transient', () => {

            it("sets property as ignored", (done) => {

                getTransientFieldMapping(done, (property) => assert.isTrue(property.hasFlags(MappingModel.PropertyFlags.Ignored)));
            });

            it("sets field name to null.", (done) => {

                getTransientFieldMapping(done, (property) => assert.isNull(property.field));
            });

            function getTransientFieldMapping(done: Callback, callback: (mapping: Property) => void): void {

                processFixture("transient", done, (results) => {

                    var classMapping = findMapping(results, "A");
                    var property = classMapping.getProperty("a");
                    assert.ok(property, "Unable to get property 'a' on class 'A' in fixture 'transient'.");
                    callback(property);
                });
            }
        });
    });
});

function processFixture(file: string, done: (err?: Error) => void, callback?: (results: EntityMapping[]) => void): void {

    processFixtureWithConfiguration(file, new Configuration(), done, callback);
}

function processFixtureWithConfiguration(file: string, config: Configuration, done: (err?: Error) => void, callback?: (results: EntityMapping[]) => void): void {

    var provider = new AnnotationMappingProvider();
    requireFiles(["build/tests/fixtures/annotations/" + file + ".js"], (err, modules) => {
        if(err) return done(err);

        provider.addModules(modules);

        provider.getMapping(config, (err, mappings) => {
            if(err) return done(err);

            if(callback) {
                callback(<EntityMapping[]>mappings.filter((x) => (x.flags & MappingModel.MappingFlags.Entity) !== 0));
            }
            done();
        });
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

    areEqual(field1: any, field2: any): boolean {

        return field1 === field2;
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
    
    areEqual(field1: any, field2: any): boolean {

        return field1 === field2;
    }
}