/// <reference path="../../typings/mongodb.d.ts" />

import mongodb = require("mongodb");

import DatabaseDriver = require("./databaseDriver");
import Connection = require("./connection");
import ResultCallback = require("../resultCallback");
import IdentityGenerator = require("../id/identityGenerator");
import ObjectIdGenerator = require("../id/objectIdGenerator");
import MongoConnection = require("./mongoConnection");

// TODO: switch to mongodb-core driver? https://github.com/christkv/mongodb-core

class MongoDriver implements DatabaseDriver {

    private _defaultGenerator = new ObjectIdGenerator();

    connect(url: string, options: any, callback: ResultCallback<Connection>): void {

        mongodb.MongoClient.connect(url, options, (err, db) => {
            if(err) return callback(err);
            callback(null, new MongoConnection(<any>db, this));
        });
    }

    defaultIdentityGenerator(): IdentityGenerator {
        return this._defaultGenerator;
    }
}

export = MongoDriver;
