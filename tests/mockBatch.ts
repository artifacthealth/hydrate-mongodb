import Persister = require("../src/persister");
import Changes = require("../src/mapping/changes");
import Callback = require("../src/core/callback");
import Batch = require("../src/batch");

class MockBatch implements Batch {

    addInsert(document: any, persister: Persister): void {

    }

    addReplace(document: any, persister: Persister): void {

    }

    addUpdate(id: any, changes: Changes, persister: Persister): void {

    }

    addRemove(id: any, persister: Persister): void {

    }

    execute(callback: Callback): void {
        process.nextTick(callback);
    }
}

export = MockBatch;