/*!
 * Code in this file is based on the async library. Original copyright below.
 *
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */

import {ResultCallback} from "./callback";
import {Constructor} from "../hydrate";

function only_once<T>(fn: ResultCallback<T>): ResultCallback<T> {
    var called = false;
    return function() {
        if (called) throw new Error("Callback was already called.");
        called = true;
        fn.apply(global, arguments);
    }
}
