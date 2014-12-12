import Connection = require("./connection");
import ResultCallback = require("../resultCallback");
import ObjectId = require("./objectId");

interface DatabaseDriver {

    connect(url: string, options: any, callback: ResultCallback<Connection>): void;
    createObjectId(): ObjectId;
}

export = DatabaseDriver;