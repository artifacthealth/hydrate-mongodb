/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";
import {ObjectMapping} from "../../src/mapping/objectMapping";
import {Property} from "../../src/mapping/property";
import {PropertyFlags} from "../../src/mapping/propertyFlags";

describe('ObjectMapping', () => {

    describe('addProperty', () => {

        it('requires a field mapping on the property unless the property is ignored', () => {

            var mapping = new ObjectMapping();
            var property = new Property("test", new ObjectMapping());

            // Add without field - error
            assert.throws(() => {
                mapping.addProperty(property);
            }, "Property must define a 'field' mapping if the property is not ignored");

            // Add with field - no error
            property.field = "test";
            mapping.addProperty(property);

            // Add without filed but with ignore flag - no error
            var property2 = new Property("blah", new ObjectMapping());
            property2.setFlags(PropertyFlags.Ignored);
            mapping.addProperty(property2);
        });
    });
});