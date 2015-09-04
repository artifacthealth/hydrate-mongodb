import ResultCallback = require("../core/resultCallback");

interface Query<T> {

    execute(callback: ResultCallback<T>): void;
}

export = Query;