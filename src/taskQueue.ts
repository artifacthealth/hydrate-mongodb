import ResultCallback = require("./core/resultCallback");
import Table = require("./core/table");

interface Task {

    operation: number;
    wait: number;
    arg: any;
    callback: ResultCallback<any>;
    finished: boolean;
    next?: Task;
}

class TaskQueue {

    private _execute: (operation: number, arg: any, callback: ResultCallback<any>) => void;
    private _activeCounts: Table<number> = {};
    private _active: number = 0;
    private _head: Task;
    private _tail: Task;
    private _error: Error;
    private _closed: boolean;

    constructor(execute: (operation: number, arg: any, callback: ResultCallback<any>) => void) {

        this._execute = execute;
    }

    add(operation: number, wait: number, arg: any, callback?: ResultCallback<any>): void {

        if(this._closed) {
            return callback(new Error("Session is closed."));
        }

        var task: Task = {
            operation: operation,
            wait: wait,
            arg: arg,
            callback: callback,
            finished: false
        }

        // initialize counts for this operation if it's the first time the operation has been added
        if(this._activeCounts[operation] === undefined) {
            this._activeCounts[operation] = 0;
        }

        if(this._head) {
            // add task to the end of the queue
            this._tail = this._tail.next = task;
        }
        else {
            // this is the first task so initialize the queue and start processing
            this._head = this._tail = task;
            process.nextTick(() => this._process());
        }
    }

    close(): void {
        this._closed = true;
    }

    // TODO: if an error occurs should we stop processing of the queue altogether and set the session as invalid? Yes.
    // TODO: if an error occurs that is not handled by a callback, should we skip all other scheduled tasks until we get one that has a callback to pass the error to? The reason for this is that we don't want to continue processing the queue.
    // TODO: if we can't find any queued tasks that have a callback then just raise the error or emit as an even on the session
    private _process(): void {

        // check to see if this task needs to wait on any of the active tasks
        var task = this._head;
        while(task && !(task.wait & this._active)) {
            // we are not waiting on anything so deque the task
            this._head = this._head.next;

            // If we have a queued error and the task has a callback, pass the error to the callback and don't
            // execute the task.
            if(this._error && task.callback) {
                var error = this._error;
                this._error = undefined;
                process.nextTick(() => task.callback(error));
                return;
            }

            if(!this._activeCounts[task.operation]++) {
                this._active |= task.operation;
            }

            this._execute(task.operation, task.arg, this._finished(task));
            task = this._head;
        }
    }

    private _finished(task: Task): ResultCallback<any> {

        return (err, result) => {

            if(task.finished) {
                throw new Error("Task has already finished.");
            }
            task.finished = true;

            if(!(--this._activeCounts[task.operation])) {
                this._active &= ~task.operation;
            }

            if(task.callback) {
                task.callback(err, result);
            }
            else if(err && !this._error) {
                // If there is not a callback and an error occurred, save error to pass to callback when next task
                // is processed. Note that only the first error is saved. If more errors occur before next operation is
                // processed, those errors are lost.
                this._error = err;
            }

            if(this._head) {
                this._process();
            }

        }
    }
}

export = TaskQueue;