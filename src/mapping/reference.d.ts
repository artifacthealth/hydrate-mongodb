import Identifier = require("../id/identifier");
import EntityMapping = require("./entityMapping");

interface Reference {
    mapping: EntityMapping;
    id: Identifier;
}

export = Reference;