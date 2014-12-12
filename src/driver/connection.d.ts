import DatabaseDriver = require("./databaseDriver");
import Db = require("./db");

interface Connection {

    driver: DatabaseDriver;
    db: Db;
}

export = Connection;