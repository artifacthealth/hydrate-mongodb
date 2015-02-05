interface ResultCallback<T> {

    (err: Error, result?: T): void;
}

module ResultCallback {

    /**
     * Returns a new callback that first calls 'callback' then calls 'next'.
     * @param callback The first callback to call
     * @param next The next callback to call
     */
    export function chain<T>(callback: ResultCallback<T>, next: ResultCallback<T>): ResultCallback<T> {
        return (err: Error, result: any) => {
            callback(err, result);
            next(err, result);
        }
    }
}

export = ResultCallback;