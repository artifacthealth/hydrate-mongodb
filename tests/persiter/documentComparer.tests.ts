/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;

import DocumentComparer = require("../../src/persister/documentComparer");

describe('DocumentComparer', () => {

    it("identifies removed fields", () => {

        var originalDocument = {
            a: "test",
            b: 1
        }

        var newDocument = {
            b: 1
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);

        assert.equal(ret.$unset["a"], 1);
    });

    it("identifies added fields", () => {

        var originalDocument = {
            b: 1
        }

        var newDocument = {
            b: 1,
            c: "new value"
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["c"], "new value");
    });

    it("identifies changed number values", () => {

        var originalDocument = {
            a: 1,
            b: 1
        }

        var newDocument = {
            a: 1,
            b: 2
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b"], 2);
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies changed boolean values", () => {

        var originalDocument = {
            a: true,
            b: true
        }

        var newDocument = {
            a: true,
            b: false
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b"], false);
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies changed string values", () => {

        var originalDocument = {
            a: "somevalue",
            b: "oldvalue"
        }

        var newDocument = {
            a: "somevalue",
            b: "newvalue"
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b"], "newvalue");
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies changed Date values", () => {

        var originalDocument = {
            a: new Date('2011-04-11T11:51:00'),
            b: new Date('2011-04-11T11:51:00')
        }

        var newDocument = {
            a: new Date('2011-04-11T11:51:00'),
            b: new Date('2012-04-11T11:51:00')
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b"].getTime(), new Date('2012-04-11T11:51:00').getTime());
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies changed RegExp values", () => {

        var originalDocument = {
            a: /[ab]/,
            b: /[ab]/
        }

        var newDocument = {
            a: /[ab]/,
            b: /[abc]/
        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b"].toString(), /[abc]/.toString());
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies added fields in nested object", () => {

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

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b.c"], "test");
        assert.isUndefined(ret.$set["b.a"]);
    });

    it("identifies removed fields in nested object", () => {

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

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$unset["b.c"], 1);
        assert.isUndefined(ret.$unset["b.a"]);
    });

    it("identifies changed fields in nested object", () => {

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

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b.d.c"], "blah");
        assert.isUndefined(ret.$set["b.d.a"]);
    });

    it("sets entire array if new array is shorted than old array", () => {

        var originalDocument = {
            a: [1, 2],
            b: [1, 2]
        }

        var newDocument = {
            a: [1, 2],
            b: [1]

        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.deepEqual(ret.$set["b"], [1]);
        assert.isUndefined(ret.$set["a"]);
    });

    it("sets entire array if new array is longer than old array", () => {

        var originalDocument = {
            a: [1, 2],
            b: [1, 2]
        }

        var newDocument = {
            a: [1, 2],
            b: [1, 2, 3]

        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.deepEqual(ret.$set["b"], [1, 2, 3]);
        assert.isUndefined(ret.$set["a"]);
    });

    it("identifies changed array elements if old and new array are same length", () => {

        var originalDocument = {
            a: [1, 2, 3],
            b: [1, 2, 3]
        }

        var newDocument = {
            a: [1, 2, 3],
            b: [4, 3, 2]

        }

        var ret = DocumentComparer.compare(originalDocument, newDocument);
        assert.equal(ret.$set["b.0"], 4);
        assert.equal(ret.$set["b.1"], 3);
        assert.equal(ret.$set["b.2"], 2);
        assert.isUndefined(ret.$set["a"]);
    });

    it("performance", () => {

        var a: any = {
            list: []
        };
        var b: any = {
            list: []
        };
        for(var i = 0; i < 100; i++) {
            a.list.push(i);
            b.list.push(100-i)
        }

        var start = process.hrtime();
        for(var i = 0; i < 10000; i++) {
            var changes = DocumentComparer.compare(a, b);
        }

        // divide by a million to get nano to milli
        var elapsed = process.hrtime(start);
        console.log("Compared " + i + " objects in " + elapsed[0] + "s, " + (elapsed[1]/1000000).toFixed(3) + "ms");
    });
});

