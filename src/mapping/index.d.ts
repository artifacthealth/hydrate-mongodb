import IndexOptions = require("../driver/indexOptions");
import Map = require("../map");

interface Index {

    keys: Map<number>;
    options?: IndexOptions;
}

export = Index;