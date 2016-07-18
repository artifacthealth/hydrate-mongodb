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
    var property = new Property("_a", new StringMapping());
    property.field = "a";
    mapping.addProperty(property);
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