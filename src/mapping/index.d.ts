import IndexOptions = require("./indexOptions");

interface Index {

    keys: [string, number][];
    options?: IndexOptions;
}

export = Index;