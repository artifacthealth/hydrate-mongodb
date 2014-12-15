import CollectionTable = require("./driver/collectionTable");
import Connection = require("./driver/connection");
import MappingRegistry = require("./mapping/mappingRegistry");
import Session = require("./session");
import SessionImpl = require("./sessionImpl");

class SessionFactory {

    constructor(public collections: CollectionTable, public mappingRegistry: MappingRegistry) {

    }

    createSession(): Session {

        return new SessionImpl(this);
    }
}

export = SessionFactory;