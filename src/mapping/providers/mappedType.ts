import {Mapping} from "../mapping";
import {Type} from "../../core/type";
import {MappedTypeContext} from "./mappedTypeContext";

export class MappedType {

    type: Type;
    mapping: Mapping;

    protected context: MappedTypeContext;

    private _populated: boolean;

    constructor(context: MappedTypeContext, type: Type, mapping: Mapping) {

        this.context = context;
        this.type = type;
        this.mapping = mapping;
    }

    populate(): void {

        if(!this._populated) {
            this._populated = true;

            this.populateCore();
        }
    }

    protected populateCore(): void {

    }
}