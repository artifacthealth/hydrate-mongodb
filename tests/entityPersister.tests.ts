/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>
/// <reference path="../typings/async.d.ts" />

import async = require("async");
import chai = require("chai");
import assert = chai.assert;

import Configuration = require("../src/config/configuration");
import InternalSession = require("../src/internalSession");
import InternalSessionFactory = require("../src/internalSessionFactory");
import Persister = require("../src/persisterImpl");
import PropertyFlags = require("../src/mapping/propertyFlags");
import model = require("./fixtures/model");

describe('EntityPersisterTests', () => {


});