import ResultCallback = require("../core/resultCallback");
import Query = require("./query");

interface CountQuery extends Query<number> {

    limit(value: number, callback?: ResultCallback<number>): CountQuery;
    skip(value: number, callback?: ResultCallback<number>): CountQuery;
}

export = CountQuery;

