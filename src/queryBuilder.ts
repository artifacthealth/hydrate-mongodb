import Constructor = require("./constructor");

class QueryBuilder<T> {

    private _ctr: Constructor<T>;

    constructor(ctr: Constructor<T>) {

        this._ctr = ctr;
    }
}

export = QueryBuilder;