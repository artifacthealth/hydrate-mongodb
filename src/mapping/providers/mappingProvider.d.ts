import ResultCallback = require("../../core/resultCallback");
import Configuration = require("../../config/configuration");
import Mapping = require("../mapping");

interface MappingProvider {

    getMapping(config: Configuration, callback: ResultCallback<Mapping.ClassMapping[]>): void;
}

export = MappingProvider;