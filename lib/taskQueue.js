var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require("events");
var TaskQueue = (function (_super) {
    __extends(TaskQueue, _super);
    function TaskQueue(execute) {
        _super.call(this);
        this._activeCounts = {};
        this._active = 0;
        this._execute = execute;
    }
    TaskQueue.prototype.add = function (operation, wait, arg, callback) {
        var _this = this;
        if (this._closed) {
            return callback(new Error("Session is closed."));
        }
        if (this._invalid) {
            return callback(new Error("Session is invalid. An error occurred during a previous action."));
        }
        var task = {
            operation: operation,
            wait: wait,
            arg: arg,
            callback: callback,
            finished: false
        };
        // initialize counts for this operation if it's the first time the operation has been added
        if (this._activeCounts[operation] === undefined) {
            this._activeCounts[operation] = 0;
        }
        if (this._head) {
            // add task to the end of the queue
            this._tail = this._tail.next = task;
        }
        else {
            // this is the first task so initialize the queue and start processing
            this._head = this._tail = task;
            process.nextTick(function () { return _this._process(); });
        }
    };
    /**
     * Clears the current queue and prevents any new actions from being added to the queue. Note that any currently
     * executing tasks may still return and call their callback.
     */
    TaskQueue.prototype.close = function () {
        this._closed = true;
        this._clear();
    };
    TaskQueue.prototype._process = function () {
        // check to see if this task needs to wait on any of the active tasks
        var task = this._head;
        while (task && !(task.wait & this._active)) {
            // we are not waiting on anything so deque the task
            this._head = this._head.next;
            if (!this._activeCounts[task.operation]++) {
                this._active |= task.operation;
            }
            this._execute(task.operation, task.arg, this._finished(task));
            task = this._head;
        }
    };
    TaskQueue.prototype._finished = function (task) {
        var _this = this;
        return function (err, result) {
            if (task.finished) {
                throw new Error("Callback for task can only be called once.");
            }
            task.finished = true;
            if (!(--_this._activeCounts[task.operation])) {
                _this._active &= ~task.operation;
            }
            // if we got an error during execution of the task, flag the queue as invalid before the callback is
            // executed in case the callback tries to queue up additional tasks.
            if (err) {
                _this._invalid = true;
            }
            if (task.callback) {
                task.callback(err, result);
            }
            if (err) {
                // if the task did not have a callback, handle the error
                if (!task.callback) {
                    _this._unhandledError(err);
                }
                // stop execution of any queued tasks
                _this._clear();
                return;
            }
            if (_this._head) {
                _this._process();
            }
        };
    };
    TaskQueue.prototype._unhandledError = function (err) {
        // find the next task that has a callback
        var task = this._head;
        while (task && !task.callback) {
            task = task.next;
        }
        // if we found a task with a callback, pass the error to that task.
        if (task && task.callback) {
            task.callback(err);
        }
        else {
            this.emit('error', err);
        }
    };
    TaskQueue.prototype._clear = function () {
        this._head = this._tail = null;
    };
    return TaskQueue;
})(events.EventEmitter);
module.exports = TaskQueue;
