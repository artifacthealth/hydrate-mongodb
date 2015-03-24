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
 */
function onlyOnce(callback) {
    var called = false;
    return function (err) {
        if (called)
            throw new Error("Callback was already called.");
        called = true;
        callback(err);
    };
}
exports.onlyOnce = onlyOnce;
/**
 * Returns a new callback that first calls 'callback' then calls 'next'.
 * @param callback The first callback to call
 * @param next The next callback to call
 */
function chain(callback, next) {
    return function (err, result) {
        callback(err, result);
        next(err, result);
    };
}
exports.chain = chain;
