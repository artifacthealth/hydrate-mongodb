/// <reference path="../../typings/node.d.ts" />

import fs = require("fs");
import Connection = require("../driver/connection");
import ResultCallback = require("../core/resultCallback");
import Configuration = require("./Configuration");
import SessionFactory = require("../sessionFactory");

class FileConfiguration {

    constructor(public filename: string, public encoding?: string) {

    }

    createSessionFactory(callback: ResultCallback<SessionFactory>): void;
    createSessionFactory(connection: Connection, callback: ResultCallback<SessionFactory>): void;
    createSessionFactory(connectionOrCallback: any, callback?: ResultCallback<SessionFactory>): void {

        fs.readFile(this.filename, this.encoding || "utf8", (err: Error, text: string) => {
            if (err) return callback(err, null);
            if (!text) {
                return callback(new Error("File '" + this.filename + "' was empty."));
            }

            try {
                var configuration = new Configuration(JSON.parse(text));
                configuration.createSessionFactory(connectionOrCallback, callback);
            }
            catch(e) {
                return callback(e);
            }
        });
    }
}

export = FileConfiguration;