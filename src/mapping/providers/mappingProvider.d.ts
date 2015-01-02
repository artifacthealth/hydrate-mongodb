import ResultCallback = require("../../core/resultCallback");
import MappingRegistry = require("../mappingRegistry");

interface MappingProvider {

    getMapping(callback: ResultCallback<MappingRegistry>): void;
}

export = MappingProvider;