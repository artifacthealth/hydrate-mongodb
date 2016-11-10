// TODO: Add copyright "This code modified ... "
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */

/**
 * Returns a new callback that will raise an error if called more than once.
 * @param callback The original callback
 * @hidden
 */
export function onlyOnce<T>(callback: Callback): Callback {
    var called = false;
    return (err?: Error) => {
        if (called) throw new Error("Callback was already called.");
        called = true;
        callback(err);
    }
}

/**
 * Returns a new callback that first calls 'callback' then calls 'next'.
 * @param callback The first callback to call
 * @param next The next callback to call
 * @hidden
 */
export function chain<T>(callback: ResultCallback<T>, next: ResultCallback<T>): ResultCallback<T> {
    return (err: Error, result: any) => {
        callback(err, result);
        next(err, result);
    }
}

export interface Callback {

    (err?: Error): void;
}

export interface ResultCallback<T> {

    (err?: Error, result?: T): void;
}

export interface IteratorCallback<T> {

    (item: T, callback: Callback): any;
}
