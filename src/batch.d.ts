import Persister = require("./persister");
import Changes = require("./mapping/changes");
import Callback = require("./core/callback");

interface Batch {

    addInsert(document: any, persister: Persister): void;
    addReplace(document: any, persister: Persister): void;
    addUpdate(id: any, changes: Changes, persister: Persister): void;
    addRemove(id: any, persister: Persister): void;
    execute(callback: Callback): void;
}

export = Batch;