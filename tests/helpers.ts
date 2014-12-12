/// <reference path="../typings/tsreflect.d.ts"/>

import reflect = require("tsreflect");

var fixtureDir = "tests/fixtures/";

export function referenceFixture(filename: string): void {

    reflect.reference(fixtureDir + filename);
}

export function requireFixture(filename: string): reflect.Symbol {

    return reflect.require(fixtureDir + filename);
}
