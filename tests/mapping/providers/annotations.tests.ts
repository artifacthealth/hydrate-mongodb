import {assert} from "chai";
import * as annotations from "../../../src/mapping/providers/annotations";

describe('annotations', () => {

    describe('FieldAnnotation', () => {

        describe('constructor', () => {

            it('accepts a single argument of the name', () => {

                var annotation = new annotations.FieldAnnotation("test");
                assert.equal(annotation.name, "test");
                assert.isUndefined(annotation.nullable);
            });

            it('accepts an object that can include the name and nullable properties', () => {

                var annotation = new annotations.FieldAnnotation({ name: "test2", nullable: true });
                assert.equal(annotation.name, "test2");
                assert.isTrue(annotation.nullable);
            });
        });
    });
});
