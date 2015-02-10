/// <reference path="../../typings/mongodb.d.ts" />

import mongodb = require("mongodb");
import Callback = require("../core/callback");
import ResultCallback = require("../core/resultCallback");
import Collection = require("./collection");
import CollectionOptions = require("../mapping/collectionOptions");
import Connection = require("./connection");
import DatabaseDriver = require("./databaseDriver");
import MongoDriver = require("./mongoDriver");

class MongoConnection implements Connection {

    constructor(public db: mongodb.Db, public driver: DatabaseDriver) {

    }

    static fromMongoDb(db: mongodb.Db): MongoConnection {

        return new MongoConnection(db, new MongoDriver());
    }
}

export = MongoConnection;