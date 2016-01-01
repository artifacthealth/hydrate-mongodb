/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import {assert} from "chai";
import * as RegExpUtil from "../../src/core/regExpUtil";

describe('RegExpUtil', () => {

    describe('clone', () => {

        it('returns a clone of the regular expression', () => {

            var clone = RegExpUtil.clone(/[ab]/);
            assert.equal(clone.toString(), "/[ab]/");
        });

        it('correctly clones global flag', () => {

            var clone = RegExpUtil.clone(/[ab]/g);
            assert.equal(clone.toString(), "/[ab]/g");
        });

        it('correctly clones ignore-case flag', () => {

            var clone = RegExpUtil.clone(/[ab]/i);
            assert.equal(clone.toString(), "/[ab]/i");
        });

        it('correctly clones multiline flag', () => {

            var clone = RegExpUtil.clone(/[ab]/m);
            assert.equal(clone.toString(), "/[ab]/m");
        });
    });
});
