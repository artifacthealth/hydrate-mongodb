import {Mapping} from "../mapping";
import {Type} from "../../core/type";
import {MappingBuilderContext} from "./mappingBuilderContext";

export class MappingBuilder {

    type: Type;
    mapping: Mapping;

    protected context: MappingBuilderContext;

    private _populated: boolean;

    constructor(context: MappingBuilderContext, type: Type, mapping: Mapping) {

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