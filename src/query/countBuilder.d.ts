import ResultCallback = require("../core/resultCallback");

interface CountBuilder<T> {

    limit(value: number, callback?: ResultCallback<T>): CountBuilder<T>;
    skip(value: number, callback?: ResultCallback<T>): CountBuilder<T>;
}

export = CountBuilder;

