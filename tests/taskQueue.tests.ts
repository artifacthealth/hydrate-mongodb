/// <reference path="../typings/mocha.d.ts"/>
/// <reference path="../typings/chai.d.ts"/>

import chai = require("chai");
import assert = chai.assert;

import TaskQueue = require("../src/taskQueue");

enum Action {

    Save = 0x00000001,
    Remove = 0x00000002,
    Detach = 0x00000004,
    Flush = 0x00000008
}

describe('TaskQueue', () => {

    it('passes argument that was passed to add to the execute callback', (done) => {

        var queue = new TaskQueue((action, arg, callback) => {
            assert.equal(arg, 42);
            done();
        });

        queue.add(Action.Save, Action.Flush, 42);
    });

    it('executes tasks in parallel if they are not waiting on any other task', (done) => {

        var count = 0;

        var queue = new TaskQueue((action, arg, callback) => {
            count++;
            process.nextTick(() => callback(null));
        });

        queue.add(Action.Save, Action.Flush, 0, () => {
            assert.equal(count, 3);
        });
        queue.add(Action.Save, Action.Flush, 0, () => {
            assert.equal(count, 3);
        });
        queue.add(Action.Save, Action.Flush, 0, () => {
            assert.equal(count, 3);
            done();
        });
    });

    it('waits until tasks specified by the wait arguments are finished until executing the next task', (done) => {

        var count = 0;

        var queue = new TaskQueue((action, arg, callback) => {
            count++;
            process.nextTick(() => callback(null));
        });

        queue.add(Action.Save, Action.Save, 0, () => {
            assert.equal(count, 1);
        });
        queue.add(Action.Save, Action.Save, 0, () => {
            assert.equal(count, 2);
        });
        queue.add(Action.Save, Action.Save, 0, () => {
            assert.equal(count, 3);
            done();
        });
    });

    it('throws error if callback for task is called more than once', (done) => {

        var queue = new TaskQueue((action, arg, callback) => {
            callback(null);
            assert.throw(() => callback(null), "Callback for task can only be called once.");
            done();
        });

        queue.add(Action.Save, Action.Flush, 0);
    });

    it('passes error to next task with a callback if an error occurs when a executing task that does not have a callback', (done) => {

        var count = 0;
        var queue = new TaskQueue((action, arg, callback) => {
            process.nextTick(() => callback(new Error((++count).toString())));
        });

        // this task will return an error
        queue.add(Action.Save, Action.Flush, 0);
        // this task will be skipped
        queue.add(Action.Save, Action.Save, 0);
        // this task will be passed the error
        queue.add(Action.Flush, Action.Save, 0, (err) => {
            assert.ok(err);
            assert.equal(err.message, "1");
            done();
        });
    });

    it('emits the error if an error occurs when a executing task that does not have a callback and no other tasks in the queue have a callback', (done) => {

        var count = 0;
        var queue = new TaskQueue((action, arg, callback) => {
            process.nextTick(() => callback(new Error((++count).toString())));
        });

        // this task will return an error
        queue.add(Action.Save, Action.Flush, 0);
        // this task will be skipped
        queue.add(Action.Save, Action.Save, 0);

        queue.on('error', (err: Error) => {
            assert.ok(err);
            assert.equal(err.message, "1");
            done();
        });
    });

    it('emits error when queue is closed and add does not have a callback', (done) => {

        var count = 0;
        var queue = new TaskQueue((action, arg, callback) => {
            process.nextTick(() => callback(new Error((++count).toString())));
        });

        // this task will return an error
        queue.add(Action.Save, Action.Flush, 0);

        var first = true;

        queue.on('error', (err: Error) => {
            assert.ok(err);

            if(first) {
                first = false;
                // this will cause an invalid session error to be emitted
                queue.add(Action.Save, Action.Flush, 0);
            }
            else {
                assert.equal(err.message, "Session is invalid. An error occurred during a previous action.");
                done();
            }
        });
    });

    it('does not allow any tasks to be added to the queue after an error occurs', (done) => {

        var count = 0;
        var queue = new TaskQueue((action, arg, callback) => {
            process.nextTick(() => callback(new Error((++count).toString())));
        });

        queue.add(Action.Save, 0, null, (err: Error) => {
            assert.ok(err);
            assert.equal(err.message, "1");

            queue.add(Action.Save, 0, null, (err: Error) => {
                // TODO: check error code
                assert.instanceOf(err, Error);
                assert.equal(err.message, "Session is invalid. An error occurred during a previous action.");
                done();
            });
        });
    });
});