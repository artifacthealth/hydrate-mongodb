import {MappingModel} from "../mappingModel";
import {MappingBuilderContext} from "./mappingBuilderContext";

/**
 * @hidden
 */
export class MappingBuilder {

    name: string;
    mapping: MappingModel.Mapping;

    protected context: MappingBuilderContext;

    private _populated: boolean;
    private _constructed: boolean;

    constructor(context: MappingBuilderContext, mapping: MappingModel.Mapping, name: string) {

        this.context = context;
        this.mapping = mapping;
        this.name = name;
    }

    construct(): void {

        if(!this._constructed) {
            this._constructed = true;

            this.constructCore();
        }
    }

    protected constructCore(): void {

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
