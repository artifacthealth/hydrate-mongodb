import {assert} from "chai";
import {Command} from "../src/core/command";
import {Batch} from "../src/batch";
import {FlushPriority} from "../src/mapping/mappingModel";

var executeOrder: number,
    group: number;

describe('Batch', () => {

    describe('execute', () => {

        beforeEach(() => {
            executeOrder = 0;
            group = 0;
        });

        it("executes higher priority commands first", (done) => {


            var command1 = new TestCommand(FlushPriority.Low);
            var command2 = new TestCommand(FlushPriority.High);
            var command3 = new TestCommand(FlushPriority.Medium);

            var batch = new Batch();
            batch.addCommand(1, command1);
            batch.addCommand(2, command2);
            batch.addCommand(3, command3);

            batch.execute((err) => {
                if (err) return done(err);

                assert.equal(command2.executeOrder, 0);
                assert.equal(command3.executeOrder, 1);
                assert.equal(command1.executeOrder, 2);

                done();
            });
        });

        it("executes commands with the same priority in parallel", (done) => {

            var command1 = new TestCommand(FlushPriority.Low);
            var command2 = new TestCommand(FlushPriority.High);
            var command3 = new TestCommand(FlushPriority.Low);
            var command4 = new TestCommand(FlushPriority.Low);

            var batch = new Batch();
            batch.addCommand(1, command1);
            batch.addCommand(2, command2);
            batch.addCommand(3, command3);
            batch.addCommand(4, command4);

            batch.execute((err) => {
                if (err) return done(err);

                assert.equal(command2.executeOrder, 0, "Command 2 should be executed first");
                assert.notEqual(command2.group, command1.group, "Command 1 and Command 2 should be executed in series.");

                assert.equal(command3.group, command1.group, "Command 3 was not executed in parallel with Command 1");
                assert.equal(command4.group, command1.group, "Command 4 was not executed in parallel with Command 1");

                done();
            });
        });
    });
});

class TestCommand implements Command {

    executeOrder: number;
    group: number;

    constructor(public priority: number) {

    }

    execute(callback: Callback): void {

        this.executeOrder = executeOrder++;
        this.group = group;

        process.nextTick(nextGroup);
        process.nextTick(callback);
    }
}

function nextGroup(): void {

    group++;
}
