import Constructor = require("./core/constructor");
import Identifier = require("./id/identifier");

class Reference {

    constructor(public ctr: Constructor<any>, public id: Identifier) {

    }

    static isReference(obj: any): boolean {
        return obj instanceof Reference;
    }
}

export = Reference;