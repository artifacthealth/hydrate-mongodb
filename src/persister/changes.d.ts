import Map = require("../core/map");

interface Changes {

    $set?: Map<any>;
    $unset?: Map<any>;
}

export = Changes;