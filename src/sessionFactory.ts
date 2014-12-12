import Connection = require("./driver/connection");
import Session = require("./session");
import MappingRegistry = require("./mapping/mappingRegistry");

class SessionFactory {

    private _connection: Connection;

    constructor(connection: Connection, public mappingRegistry: MappingRegistry) {

        this._connection = connection;
    }

    createSession(): Session {

        return new Session(this._connection, this);
    }
}

export = SessionFactory;