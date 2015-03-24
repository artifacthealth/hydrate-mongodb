interface ResultCallback<T> {

    (err: Error, result?: T): void;
}

export = ResultCallback;