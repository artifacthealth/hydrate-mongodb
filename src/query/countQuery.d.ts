import ResultCallback = require("../core/resultCallback");

interface CountQuery {

    limit(value: number, callback?: ResultCallback<number>): CountQuery;
    skip(value: number, callback?: ResultCallback<number>): CountQuery;
}

export = CountQuery;

