/*!
 * Code in this file is based on the async library. Original copyright below.
 *
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
var Async;
(function (Async) {
    /**
     * Asynchronous forEach. Same as async.each except it passes the index to the iterator.
     * See https://github.com/caolan/async.
     * @param arr The array to iterate over.
     * @param iterator The iterator to call for each item in teh array.
     * @param callback Called on error or after all items have been handled.
     */
    function forEach(arr, iterator, callback) {
        callback = callback || function () {
        };
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        for (var i = 0; i < arr.length; i++) {
            iterator(arr[i], i, only_once(done));
        }
        function done(err) {
            if (err) {
                callback(err);
                callback = function () {
                };
            }
            else {
                completed += 1;
                if (completed >= arr.length) {
                    callback();
                }
            }
        }
    }
    Async.forEach = forEach;
    function only_once(fn) {
        var called = false;
        return function () {
            if (called)
                throw new Error("Callback was already called.");
            called = true;
            fn.apply(Async, arguments);
        };
    }
})(Async || (Async = {}));
module.exports = Async;
