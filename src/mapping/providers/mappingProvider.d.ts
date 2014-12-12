import ResultCallback = require("../../resultCallback");
import TypeMapping = require("../typeMapping");

interface MappingProvider {

    getMapping(callback: ResultCallback<TypeMapping[]>): void;
}

export = MappingProvider;