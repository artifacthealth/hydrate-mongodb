import InternalSession = require("./internalSession");
import EntityMapping = require("./mapping/entityMapping");
import ResultCallback = require("./core/resultCallback");

class Reference {

    /**
     * True if the Reference has been fetched; otherwise, false.
     */
    fetched: boolean;

    constructor(public mapping: EntityMapping, public id: any) {

    }

    fetch(session: InternalSession, callback: ResultCallback<any>): void {

        if(this.mapping) {
            var persister = session.getPersister(this.mapping);
        }

        if (!persister) {
            process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
            return;
        }

        this.fetched = true;
        persister.findOneById(this.id, callback);
    }

    static isReference(obj: any): boolean {

        return obj instanceof Reference;
    }
}

export = Reference;