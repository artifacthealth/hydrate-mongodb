/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/chai.d.ts"/>

import {assert} from "chai";
import * as helpers from "../helpers";
import * as model from "../fixtures/model";

import {IdentityMapping} from "../../src/mapping/identityMapping";
import {EntityMapping} from "../../src/mapping/entityMapping";
import {ObjectIdGenerator} from "../../src/id/objectIdGenerator";
import {ReadContext} from "../../src/mapping/readContext";

describe('IdentityMapping', () => {

    describe('read', () => {

        it('converts identity to string as returned by toString()', () => {

            var mapping = new IdentityMapping();
            var id = new ObjectIdGenerator().generate();

            assert.equal(mapping.read(new ReadContext(null), id), id.toString());
        });
    });
});

