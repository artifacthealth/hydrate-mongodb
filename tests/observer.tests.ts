/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../src/core/observe.d.ts" />

import chai = require("chai");
import assert = chai.assert;

describe('Observer', () => {

    it('test', () => {

        var test: any = {
            a: ["blah"]
        }

        Object.observe(test, function(changes) {
            console.log("test", changes);
        });

        Object.observe(test.a, function(changes) {
            console.log("test.a: ", changes);
        });

        test.a[0] = "foo";
        console.log(console.log(typeof test.a));
    });
});