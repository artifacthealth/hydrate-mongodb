import {MappingModel} from "../mappingModel";
import {Type} from "reflect-helper";
import {MappingBuilderContext} from "./mappingBuilderContext";
import {MappingBuilder} from "./mappingBuilder";

/**
 * @hidden
 */
export class TypeMappingBuilder extends MappingBuilder {

    type: Type;

    constructor(context: MappingBuilderContext, mapping: MappingModel.Mapping, type: Type) {
        super(context, mapping, type.name);

        this.type = type;
    }
}
