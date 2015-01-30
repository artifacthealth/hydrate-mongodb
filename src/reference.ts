import Identifier = require("./id/identifier");
import InternalSession = require("./internalSession");
import EntityMapping = require("./mapping/entityMapping");
import ResultCallback = require("./core/resultCallback");

class Reference {

    private _session: InternalSession;

    constructor(session: InternalSession, public mapping: EntityMapping, public id: Identifier) {

        this._session = session;
    }

    fetch(callback: ResultCallback<any>): void {

        if(!this._session) {
            return callback(new Error("Cannot fetch detached reference."));
        }

        if(this.mapping) {
            var persister = this._session.getPersister(this.mapping);
        }

        if (!persister) {
            process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
            return;
        }

        // TODO: what is the impact of not queuing up this find in the taskqueue? Seems like a problem? Also should save, etc. wait on a find to finish? It does now but I'm not sure that it should
        persister.findOneById(this.id, callback);
    }

    getObject(): any {

        return this._session && this._session.getObject(this.id);
    }

    detach(): void {

        this._session = undefined;
    }

    attach(session: InternalSession): void {

        this._session = session;
    }

    static isReference(obj: any): boolean {

        return obj instanceof Reference;
    }
}

export = Reference;