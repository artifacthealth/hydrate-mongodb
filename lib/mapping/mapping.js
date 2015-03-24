var ArrayMapping = require("./arrayMapping");
var BooleanMapping = require("./booleanMapping");
var ClassMappingImpl = require("./classMapping");
var DateMapping = require("./dateMapping");
var EntityMappingImpl = require("./entityMapping");
var EnumMapping = require("./enumMapping");
var NumberMapping = require("./numberMapping");
var ObjectMappingImpl = require("./objectMapping");
var RegExpMapping = require("./regExpMapping");
var StringMapping = require("./stringMapping");
var TupleMapping = require("./tupleMapping");
var PropertyImpl = require("./property");
var Mapping;
(function (Mapping) {
    function createProperty(name, mapping) {
        if (!name) {
            throw new Error("Missing required argument 'name'.");
        }
        if (!mapping) {
            throw new Error("Missing required argument 'mapping'.");
        }
        return new PropertyImpl(name, mapping);
    }
    Mapping.createProperty = createProperty;
    function createArrayMapping(elementMapping) {
        if (!elementMapping) {
            throw new Error("Missing required argument 'elementMapping'.");
        }
        return new ArrayMapping(elementMapping);
    }
    Mapping.createArrayMapping = createArrayMapping;
    function createBooleanMapping() {
        return new BooleanMapping();
    }
    Mapping.createBooleanMapping = createBooleanMapping;
    function createClassMapping(baseClass) {
        return new ClassMappingImpl(baseClass);
    }
    Mapping.createClassMapping = createClassMapping;
    function createDateMapping() {
        return new DateMapping();
    }
    Mapping.createDateMapping = createDateMapping;
    function createEntityMapping(baseClass) {
        return new EntityMappingImpl(baseClass);
    }
    Mapping.createEntityMapping = createEntityMapping;
    function createEnumMapping(members) {
        if (!members) {
            throw new Error("Missing required argument 'members'.");
        }
        return new EnumMapping(members);
    }
    Mapping.createEnumMapping = createEnumMapping;
    function createNumberMapping() {
        return new NumberMapping();
    }
    Mapping.createNumberMapping = createNumberMapping;
    function createObjectMapping() {
        return new ObjectMappingImpl();
    }
    Mapping.createObjectMapping = createObjectMapping;
    function createRegExpMapping() {
        return new RegExpMapping();
    }
    Mapping.createRegExpMapping = createRegExpMapping;
    function createStringMapping() {
        return new StringMapping();
    }
    Mapping.createStringMapping = createStringMapping;
    function createTupleMapping(elementMappings) {
        if (!elementMappings) {
            throw new Error("Missing required argument 'elementMappings'.");
        }
        return new TupleMapping(elementMappings);
    }
    Mapping.createTupleMapping = createTupleMapping;
})(Mapping || (Mapping = {}));
module.exports = Mapping;
