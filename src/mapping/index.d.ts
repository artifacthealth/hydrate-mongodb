import IndexOptions = require("../driver/indexOptions");
import Map = require("../core/map");

interface Index {

    keys: Map<number>;
    options?: IndexOptions;
}

export = Index;