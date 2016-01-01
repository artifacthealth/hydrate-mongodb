import {ResultCallback} from "../../core/resultCallback";
import {Configuration} from "../../config/configuration";
import {Mapping} from "../mapping";

export interface MappingProvider {

    getMapping(config: Configuration, callback: ResultCallback<Mapping.ClassMapping[]>): void;
}
