import Session = require("./session");
import TypeMapping = require("./mapping/typeMapping");
import Collection = require("./driver/collection");

interface InternalSession extends Session {

    /**
     * Returns the collection for the specified mapping
     * @param mapping The mapping to get the collection for.
     */
    getCollection(mapping: TypeMapping): Collection;
}

export = InternalSession;