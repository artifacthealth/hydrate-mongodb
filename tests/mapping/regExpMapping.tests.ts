/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>
/// <reference path="../../typings/async.d.ts" />

import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";
import {RegExpMapping} from "../../src/mapping/regExpMapping";

describe('RegExpMapping', () => {

    describe('areEqual', () => {

        it('returns true if the values represent the same regular expression', () => {

            var mapping = new RegExpMapping();
            assert.isTrue(mapping.areEqual(/./, /./));
        });

        it('returns false if the values do not represent the same regular expression', () => {

            var mapping = new RegExpMapping();
            assert.isFalse(mapping.areEqual(/./, /a/));
        });

        it('considers the flags when comparing regular expressions', () => {

            var mapping = new RegExpMapping();
            assert.isFalse(mapping.areEqual(/./g, /./));
        });
    });

});
