import Constructor = require("./core/constructor");

class QueryBuilder<T> {

    private _ctr: Constructor<T>;

    constructor(ctr: Constructor<T>) {

        this._ctr = ctr;
    }
}

export = QueryBuilder;