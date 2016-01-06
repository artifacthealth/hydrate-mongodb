import {Type} from "./type";
import {Constructor} from "./constructor";

export class ReflectContext {

    private _types: WeakMap<Constructor<any>, Type> = new WeakMap();

    getType(ctr: Constructor<any>): Type {

        if(typeof ctr !== "function") {
            return null;
        }

        var type = this._types.get(ctr);
        if(!type) {
            type = new Type(this, ctr);
            this._types.set(ctr, type);
        }
        return type;
    }
}