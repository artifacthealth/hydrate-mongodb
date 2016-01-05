import {ResultCallback} from "../../core/resultCallback";
import {Configuration} from "../../config/configuration";
import {Mapping} from "../mapping";
import {Constructor} from "../../core/constructor";

export interface MappingProvider {

    configure(config: Configuration): void;
    getMapping(ctr: Constructor<any>, callback: ResultCallback<Mapping.EntityMapping>): void;
}
