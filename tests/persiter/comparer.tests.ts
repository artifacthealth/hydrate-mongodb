/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;

import Comparer = require("../../src/persister/comparer");

describe('Comparer', () => {

    it("identifies removed fields", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: "test",
            b: 1
        }

        var newDocument = {
            b: 1
        }

        var ret = comparer.compare(originalDocument, newDocument);

        assert.equal(ret.$unset.a, 1);
    });

    it("identifies added fields", () => {

        var comparer = new Comparer();

        var originalDocument = {
            b: 1
        }

        var newDocument = {
            b: 1,
            c: "new value"
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set.c, "new value");
    });

    it("identifies changed number values", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: 1,
            b: 1
        }

        var newDocument = {
            a: 1,
            b: 2
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set.b, 2);
        assert.isUndefined(ret.$set.a);
    });

    it("identifies changed boolean values", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: true,
            b: true
        }

        var newDocument = {
            a: true,
            b: false
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set.b, false);
        assert.isUndefined(ret.$set.a);
    });

    it("identifies changed string values", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: "somevalue",
            b: "oldvalue"
        }

        var newDocument = {
            a: "somevalue",
            b: "newvalue"
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set.b, "newvalue");
        assert.isUndefined(ret.$set.a);
    });

    it("identifies changed Date values", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: new Date('2011-04-11T11:51:00'),
            b: new Date('2011-04-11T11:51:00')
        }

        var newDocument = {
            a: new Date('2011-04-11T11:51:00'),
            b: new Date('2012-04-11T11:51:00')
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set.b.getTime(), new Date('2012-04-11T11:51:00').getTime());
        assert.isUndefined(ret.$set.a);
    });

    it("identifies changed RegExp values", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: /[ab]/,
            b: /[ab]/
        }

        var newDocument = {
            a: /[ab]/,
            b: /[abc]/
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set.b.toString(), /[abc]/.toString());
        assert.isUndefined(ret.$set.a);
    });

    it("identifies added fields in nested object", () => {

        var comparer = new Comparer();

        var originalDocument = {
            b: {
                a: 2
            }
        }

        var newDocument = {
            b: {
                a: 2,
                c: "test"
            }
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b.c"], "test");
        assert.isUndefined(ret.$set["b.a"]);
    });

    it("identifies removed fields in nested object", () => {

        var comparer = new Comparer();

        var originalDocument = {
            b: {
                a: 2,
                c: "test"
            }
        }

        var newDocument = {
            b: {
                a: 2
            }
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$unset["b.c"], 1);
        assert.isUndefined(ret.$unset["b.a"]);
    });

    it("identifies changed fields in nested object", () => {

        var comparer = new Comparer();

        var originalDocument = {
            b: {
                d: {
                    a: 2,
                    c: "test"
                }
            }
        }

        var newDocument = {
            b: {
                d: {
                    a: 2,
                    c: "blah"
                }
            }
        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b.d.c"], "blah");
        assert.isUndefined(ret.$set["b.d.a"]);
    });

    it("sets entire array if new array is shorted than old array", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: [1, 2],
            b: [1, 2]
        }

        var newDocument = {
            a: [1, 2],
            b: [1]

        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.deepEqual(ret.$set["b"], [1]);
        assert.isUndefined(ret.$set["a"]);
    });

    it("sets entire array if new array is longer than old array", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: [1, 2],
            b: [1, 2]
        }

        var newDocument = {
            a: [1, 2],
            b: [1, 2, 3]

        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.deepEqual(ret.$set["b"], [1, 2, 3]);
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies changed array elements if old and new array are same length", () => {

        var comparer = new Comparer();

        var originalDocument = {
            a: [1, 2, 3],
            b: [1, 2, 3]
        }

        var newDocument = {
            a: [1, 2, 3],
            b: [4, 3, 2]

        }

        var ret = comparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b.0"], 4);
        assert.equal(ret.$set["b.1"], 3);
        assert.equal(ret.$set["b.2"], 2);
        assert.isUndefined(ret.$set["a"]);
    });
});

