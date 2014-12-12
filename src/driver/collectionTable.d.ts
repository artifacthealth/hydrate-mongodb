import Collection = require("./collection");

/**
 * Table of Collections indexed by the mapping id.
 */
interface CollectionTable {

    [id: number]: Collection;
}

export = CollectionTable;