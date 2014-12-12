/// <reference path="../../typings/mongodb.d.ts" />

import mongodb = require("mongodb");

import DatabaseDriver = require("./databaseDriver");
import Connection = require("./connection");
import ResultCallback = require("../resultCallback");
import ObjectId = require("./objectId");
import MongoConnection = require("./mongoConnection")

class MongoDriver implements DatabaseDriver {

    connect(url: string, options: any, callback: ResultCallback<Connection>): void {

        mongodb.MongoClient.connect(url, options, (err, db) => {
            if(err) return callback(err);
            callback(null, new MongoConnection(<any>db, this));
        });
    }

    createObjectId(): ObjectId {
        return new mongodb.ObjectID();
    }
}

export = MongoDriver;