import ResultCallback = require("../../core/resultCallback");
import MappingRegistry = require("../mappingRegistry");
import Configuration = require("../../config/configuration");

interface MappingProvider {

    getMapping(config: Configuration, callback: ResultCallback<MappingRegistry>): void;
}

export = MappingProvider;