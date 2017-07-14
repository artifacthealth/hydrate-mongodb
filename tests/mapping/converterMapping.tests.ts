import {assert} from "chai";
import {ConverterMapping} from "../../src/mapping/converterMapping";
import {PropertyConverter} from "../../src/mapping/mappingModel";

describe('ConverterMapping', () => {

    describe('areEqual', () => {

        it('returns true if the values represent the same instance', () => {

            var mapping = new ConverterMapping(new AnyConverter());
            var obj = {};
            assert.isTrue(mapping.areEqual(obj, obj));
        });

        it('returns false if one value is null and the other one is not', () => {

            var mapping = new ConverterMapping(new AnyConverter());
            var obj = {};
            assert.isFalse(mapping.areEqual(obj, null));
            assert.isFalse(mapping.areEqual(null, obj));
        });

        it('uses `areEqual` as defined in the converter if values are not the same instance', () => {

            var mapping = new ConverterMapping(new AnyConverter());
            var obj1 = { a: 1, b: 2 };
            var obj2 = { a: 1, b: 2 };
            var obj3 = { a: 1, c: 2 };
            assert.isTrue(mapping.areEqual(obj1, obj2));
            assert.isFalse(mapping.areEqual(obj1, obj3));
        });
    });

});

class AnyConverter implements PropertyConverter {

    convertToDocumentField(property: any): any {

        return property;
    }

    convertToObjectProperty(field: any): any {

        return field;
    }

    areEqual(field1: any, field2: any): boolean {

        for (var key1 in field1) {
            if (field1.hasOwnProperty(key1)) {
                if (field1[key1] !== field2[key1]) {
                    return false;
                }
            }
        }

        for (var key2 in field2) {
            if (field2.hasOwnProperty(key2)) {
                if (field1[key2] !== field2[key2]) {
                    return false;
                }
            }
        }

        return true;
    }
}
