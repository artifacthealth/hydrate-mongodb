import Connection = require("./driver/connection");
import CollectionTable = require("./driver/collectionTable");
import Session = require("./session");
import MappingRegistry = require("./mapping/mappingRegistry");

class SessionFactory {

    constructor(public collections: CollectionTable, public mappingRegistry: MappingRegistry) {

    }

    createSession(): Session {

        return new Session(this);
    }
}

export = SessionFactory;