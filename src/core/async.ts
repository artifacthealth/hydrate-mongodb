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

export function mapSet<T> (s: Set<T>, iterator: (item: T, done: ResultCallback<T>) => void, callback: ResultCallback<Set<T>>): void {
    callback = callback || function () {};
    if (!s.size) {
        return callback(null);
    }
    var completed = 0;

    var result = new Set();
    s.forEach((item) => iterator(item, only_once(done)));

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

function only_once<T>(fn: ResultCallback<T>): ResultCallback<T> {
    var called = false;
    return function() {
        if (called) throw new Error("Callback was already called.");
        called = true;
        fn.apply(global, arguments);
    }
}
