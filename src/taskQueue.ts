import {EventEmitter} from "events";
import {ResultCallback} from "./core/callback";
import {Table} from "./core/table";
import {PersistenceError} from "./persistenceError";

/**
 * @hidden
 */
interface Task {

    operation: number;
    wait: number;
    arg: any;
    callback: ResultCallback<any>;
    finished: boolean;
    next?: Task;
}

/**
 * @hidden
 */
export class TaskQueue extends EventEmitter {

    private _execute: (operation: number, arg: any, callback: ResultCallback<any>) => void;
    private _activeCounts: Table<number> = {};
    private _active: number = 0;
    private _head: Task;
    private _tail: Task;
    private _closed: boolean;
    private _invalid: boolean;

    constructor(execute: (operation: number, arg: any, callback: ResultCallback<any>) => void) {
        super();
        this._execute = execute;
    }

    add(operation: number, wait: number, arg: any, callback?: ResultCallback<any>): void {

        var err: Error;

        if(this._closed) {
            err = new PersistenceError("Session is closed.");
        }

        if(this._invalid) {
            err = new PersistenceError("Session is invalid. An error occurred during a previous action.");
        }

        if(err) {
            callback ? callback(err) : this._unhandledError(err);
            return;
        }

        var task: Task = {
            operation: operation,
            wait: wait,
            arg: arg,
            callback: callback,
            finished: false
        };

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
            // make sure calls to _process are async
            process.nextTick(() => this._process());
        }
    }

    /**
     * Returns true if the TaskQueue is invalid because an error occurred; otherwise, return false.
     */
    get invalid(): boolean {

        return this._invalid;
    }

    /**
     * Clears the current queue and prevents any new actions from being added to the queue. Note that any currently
     * executing tasks may still return and call their callback.
     */
    close(): void {
        this._closed = true;
        this._clear();
    }

    private _process(): void {

        // check to see if this task needs to wait on any of the active tasks
        var task = this._head;
        while(task && !(task.wait & this._active)) {
            // we are not waiting on anything so deque the task
            this._head = this._head.next;

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
                throw new PersistenceError("Callback for task can only be called once.");
            }
            task.finished = true;

            if(!(--this._activeCounts[task.operation])) {
                this._active &= ~task.operation;
            }

            // if we got an error during execution of the task, flag the queue as invalid before the callback is
            // executed in case the callback tries to queue up additional tasks.
            if(err) {
                this._invalid = true;
            }

            if(task.callback) {
                task.callback(err, result);
            }

            if(err) {
                // if the task did not have a callback, handle the error
                if(!task.callback) {
                    this._unhandledError(err);
                }

                // stop execution of any queued tasks
                this._clear();
                return;
            }

            if(this._head) {
                // make sure calls to _process are async
                process.nextTick(() => this._process());
            }

        }
    }

    private _unhandledError(err: Error): void {

        // find the next task that has a callback
        var task = this._head;
        while(task && !task.callback) {
            task = task.next;
        }

        // if we found a task with a callback, pass the error to that task.
        if(task && task.callback) {
            task.callback(err);
        }
        else {
            this.emit('error', err);
        }
    }

    private _clear(): void {
        this._head = this._tail = null;

    }
}
