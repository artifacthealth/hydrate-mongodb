import ResultCallback = require("../../core/resultCallback");
import TypeMapping = require("../typeMapping");

interface MappingProvider {

    getMapping(callback: ResultCallback<TypeMapping[]>): void;
}

export = MappingProvider;