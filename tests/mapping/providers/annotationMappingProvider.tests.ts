import {assert} from "chai";
import {AnnotationMappingProvider} from "../../../src/mapping/providers/annotationMappingProvider";
import {Configuration} from "../../../src/config/configuration";
import {MappingRegistry} from "../../../src/mapping/mappingRegistry";
import {MappingModel, FlushPriority} from "../../../src/mapping/mappingModel";
import {EnumMapping} from "../../../src/mapping/enumMapping";
import {ClassMapping} from "../../../src/mapping/classMapping";
import {EntityMapping} from "../../../src/mapping/entityMapping";
import {EnumType} from "../../../src/mapping/enumType";
import {PropertyConverter} from "../../../src/mapping/mappingModel";
import * as ConverterFixture from "../../fixtures/annotations/converter";
import * as CircularReferenceFixture from "../../fixtures/annotations/circularReference1";
import * as ConverterOnClassFixture from "../../fixtures/annotations/converterOnClass";
import * as LifecycleFixture from "../../fixtures/annotations/lifecycle";
import {requireFiles, findMapping} from "../../helpers";
import {IdentityMapping} from "../../../src/mapping/identityMapping";
import {Callback} from "../../../src/core/callback";
import {ResultCallback} from "../../../src/core/callback";
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

        describe('@id', () => {

            it("sets mapping on field to IdentityMapping", (done) => {

                getIdentityFieldMapping(done, (property) => assert.instanceOf(property.mapping, IdentityMapping));
            });

            it("sets property as read-only", (done) => {

                getIdentityFieldMapping(done, (property) => assert.isTrue(property.hasFlags(MappingModel.PropertyFlags.ReadOnly)));
            });

            it("sets field mapping on property to '_id'.", (done) => {

                getIdentityFieldMapping(done, (property) => assert.equal(property.field, "_id"));
            });

            it("throws error if target class is not on an entity", (done) => {

                processFixture("idOnEmbeddable", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Annotation can only be defined on entities");
                    done();
                });
            });

            it("throws error if target property is not a string", (done) => {

                processFixture("idOnNumber", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Annotation can only be defined on a property that is of type 'string'.");
                    done();
                });
            });


            function getIdentityFieldMapping(done: Callback, callback: (mapping: Property) => void): void {

                processFixture("id", done, (results) => {

                    var classMapping = findMapping(results, "A");
                    var property = classMapping.getProperty("id");
                    assert.ok(property, "Unable to get property 'id' on class 'A' in fixture 'id'.");
                    callback(property);
                });
            }
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

            it('adds index defined on subclass to root type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingA = findMapping(results, "A");
                    var mappingB = findMapping(results, "B");
                    assert.equal(mappingB.indexes, undefined);
                    assert.lengthOf(mappingA.indexes, 4);
                });
            });

            it('adds index defined on class property to root type', (done) => {

                processFixture("index", done, (results) => {

                    var mappingD = findMapping(results, "D");
                    assert.lengthOf(mappingD.indexes, 4);

                    assert.deepEqual(mappingD.indexes[0].keys, [['a', 1]]);
                    assert.deepEqual(mappingD.indexes[1].keys, [['g', -1]]);
                    assert.isTrue(mappingD.indexes[2].options.dropDups);
                    assert.deepEqual(mappingD.indexes[3].keys, [['_id', 1],['__v', 1]]);
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

        describe('@postLoad', () => {

            it("adds method to lifecycle callbacks", (done) => {

                processFixture("lifecycle", (err) => { if(err) done(err); }, (results) => {

                    var mapping = findMapping(results, "A");

                    var a = new LifecycleFixture.A();
                    mapping.executeLifecycleCallbacks(a, MappingModel.LifecycleEvent.PostLoad, (err) => {
                        if(err) return done(err);

                        assert.equal(a.loadACalled, 1);
                        done();
                    });
                });
            });

            it("adds callback for base type to list of lifecycle methods before derived type callback", (done) => {

                processFixture("lifecycle", (err) => { if(err) done(err); }, (results) => {

                    var mapping = findMapping(results, "B");

                    var b = new LifecycleFixture.B();
                    mapping.executeLifecycleCallbacks(b, MappingModel.LifecycleEvent.PostLoad, (err) => {
                        if(err) return done(err);
                        assert.equal(b.loadACalled, 1);
                        assert.equal(b.loadBCalled, 1);
                        assert.isTrue(b.loadAOrder < b.loadBOrder, "Expected callback for A to be called before callback for B.");
                        done();
                    });
                });
            });

            it("throws error if callback has more than one parameter", (done) => {

                processFixture("lifecycleExtraParams", (err) => {
                    assert.ok(err);
                    assert.include(err.message, "Lifecycle callback method must have one or no parameters.");
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