import {assert} from "chai";
import {ObjectIdGenerator} from "../../src/config/objectIdGenerator";
import {ReadContext} from "../../src/mapping/readContext";
import {ClassMapping} from "../../src/mapping/classMapping";
import {MappingModel} from "../../src/mapping/mappingModel";
import {Property} from "../../src/mapping/property";
import {StringMapping} from "../../src/mapping/stringMapping";
import {WriteContext} from "../../src/mapping/writeContext";

describe('ClassMapping', () => {

    describe('write', () => {

        it("uses a cached copy of the original document when writing an embedded immutable", () => {

            var mapping = createEmbeddableImmutableMapping();
            var readContext = new ReadContext(null);

            var originalDocument = { a: "test" };
            var readResult = mapping.read(readContext, originalDocument);

            var writeContext = new WriteContext();
            var writeResult = mapping.write(writeContext, readResult);

            assert.equal(writeResult, originalDocument, "Expected write to return original instance of document.");
        });

        it("drops `null` properties when `nullable` is false", () => {

            var mapping = createEmbeddableMapping();

            var writeContext = new WriteContext();
            var writeResult = mapping.write(writeContext, { _a: null, _b: "test" });

            assert.deepEqual(writeResult, { b: "test" });
        });

        it("keeps `null` properties when `nullable` is true", () => {

            var mapping = createEmbeddableMapping();

            var writeContext = new WriteContext();
            var writeResult = mapping.write(writeContext, { _a: "test", _b: null });

            assert.deepEqual(writeResult, { a: "test", b: null });
        });
    });

    describe('read', () => {

        it("drops `null` properties when `nullable` is false", () => {

            var mapping = createEmbeddableMapping();

            var readContext = new ReadContext(null);
            var readResult = mapping.read(readContext, { a: null, b: "test" });

            assert.isUndefined(readResult._a);
            assert.equal(readResult._b, "test");
        });

        it("keeps `null` properties when `nullable` is true", () => {

            var mapping = createEmbeddableMapping();

            var readContext = new ReadContext(null);
            var readResult = mapping.read(readContext, { a: "test", b: null });

            assert.equal(readResult._a, "test");
            assert.isNull(readResult._b);
        });
    });

    describe("areEqual", () => {

        it('returns true if both values are null', () => {

            var mapping = createEmbeddableMapping();
            assert.isTrue(mapping.areEqual(null, null));
        });

        it('return false if one value is null and the other is not', () => {

            var mapping = createEmbeddableMapping();

            assert.isFalse(mapping.areEqual(null, {}));
            assert.isFalse(mapping.areEqual({}, null));
        });
    });
});

function createEmbeddableMapping(): ClassMapping {

    return createMappingWithFlags(MappingModel.MappingFlags.Embeddable);
}

function createEmbeddableImmutableMapping(): ClassMapping {

    return createMappingWithFlags(MappingModel.MappingFlags.Immutable | MappingModel.MappingFlags.Embeddable);
}

function createMappingWithFlags(flags: MappingModel.MappingFlags): ClassMapping {

    var mapping = new ClassMapping();
    mapping.inheritanceRoot = mapping;
    mapping.flags |= flags;
    mapping.classConstructor = Test;
    mapping.name = "Test";
    var property1 = new Property("_a", new StringMapping());
    property1.field = "a";
    property1.nullable = false;
    mapping.addProperty(property1);
    var property2 = new Property("_b", new StringMapping());
    property2.field = "b";
    property2.nullable = true;
    mapping.addProperty(property2);
    return mapping;
}

class Test {

    get a(): string {

        return this._a;
    }

    private _a: string;

    constructor(a: string) {
        this._a = a;
    }
}