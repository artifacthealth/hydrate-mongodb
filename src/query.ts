import ResultCallback = require("./core/resultCallback");
import Callback = require("./core/callback");
import EntityPersister = require("./entityPersister");
import Cursor = require("./cursor");
import InternalSession = require("./internalSession");

class Query<T> {

    private _persister: EntityPersister;
    private _session: InternalSession;

    constructor(session: InternalSession, persister: EntityPersister) {
        this._persister = persister;
        this._session = session;
    }

    find(criteria: any, callback?: ResultCallback<T[]>): Cursor {
        return null;
    }

    findOne(criteria: any, callback: ResultCallback<T>): void {

    }

    findAndModify(): void {

    }

    findAndRemove(): void {

    }

    remove(criteria: any, callback: ResultCallback<T>): void {

    }

    update(selector: any, document: any, callback: ResultCallback<T>): void {

    }
}

export = Query;