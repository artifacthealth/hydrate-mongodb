/*!
 * Code in this file is based on the async library. Original copyright below.
 *
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */

import {ResultCallback} from "./resultCallback";
import {Constructor} from "./constructor";

export function mapSet<T> (s: Set<T>, iterator: (item: T, done: ResultCallback<T>) => void, callback: ResultCallback<Set<T>>): void {
    callback = callback || function () {};
    if (!s.size) {
        return callback(null);
    }
    var completed = 0;

    var result = new Set();
    for(let item of s) {
        iterator(item, only_once(done));
    }

    function done(err: Error, item: T) {
        if (err) {
            callback(err);
            callback = function () {};
        }
        else {
            completed += 1;
            result.add(item);
            if (completed >= s.size) {
                callback(null, result);
            }
        }
    }
}

export function mapIterable<T> (iterable: Iterable<T>, iterator: (item: T, done: ResultCallback<T>) => void, callback: ResultCallback<T[]>): void {
    callback = callback || function () {};

    var arr = new Array((<any>iterable).size || 0),
        completed = 0,
        exhausted = false;

    for(let item of iterable) {
        let index = completed++;
        iterator(item, only_once((err, v) => {
            arr[index] = v;
            done(err);
        }));
    }
    exhausted = true;

    if(completed === 0) callback(null);

    function done(err: Error) {
        completed--;
        if (err) {
            callback(err);
        }
        // Check finished in case iterator isn't exhausted and done resolved synchronously.
        else if (exhausted && completed <= 0) {
            callback(null, arr);
        }
    }
}


function only_once<T>(fn: ResultCallback<T>): ResultCallback<T> {
    var called = false;
    return function() {
        if (called) throw new Error("Callback was already called.");
        called = true;
        fn.apply(global, arguments);
    }
}
