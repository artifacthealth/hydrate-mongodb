import Callback = require("./callback");

interface IteratorCallback<T> {

    (item: T, callback: Callback): any;
}

export = IteratorCallback;