import {ResultCallback} from "../../core/resultCallback";
import {Configuration} from "../../config/configuration";
import {MappingModel} from "../mappingModel";

/**
 * Provides data mappings to the Configuration.
 */
export interface MappingProvider {

    /**
     * Gets a list of ClassMappings.
     * @param config The configuration to use for the mappings.
     * @param callback Called with a list of ClassMappings.
     */
    getMapping(config: Configuration, callback: ResultCallback<MappingModel.ClassMapping[]>): void;
}
