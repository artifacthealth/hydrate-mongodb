var TableKey = require("../core/tableKey");
var MappingRegistry = (function () {
    function MappingRegistry() {
        this._mappingByConstructor = [];
        this._key = new TableKey();
    }
    MappingRegistry.prototype.addMappings = function (mappings) {
        var _this = this;
        mappings.forEach(function (x) { return _this.addMapping(x); });
    };
    MappingRegistry.prototype.addMapping = function (mapping) {
        if (!mapping.classConstructor) {
            throw new Error("Class mapping is missing classConstructor.");
        }
        var key = this._key.ensureValue(mapping.classConstructor);
        if (this._mappingByConstructor[key] !== undefined) {
            throw new Error("Mapping '" + mapping.name + "' has already been registered.");
        }
        this._mappingByConstructor[this._key.ensureValue(mapping.classConstructor)] = mapping;
    };
    MappingRegistry.prototype.getEntityMappings = function () {
        return this._mappingByConstructor.filter(function (mapping) { return (mapping.flags & 1024 /* Entity */) !== 0; });
    };
    MappingRegistry.prototype.getMappings = function () {
        return this._mappingByConstructor;
    };
    MappingRegistry.prototype.getMappingForObject = function (obj) {
        return this.getMappingForConstructor(obj.constructor);
    };
    MappingRegistry.prototype.getMappingForConstructor = function (ctr) {
        if (ctr) {
            return this._mappingByConstructor[this._key.getValue(ctr)];
        }
    };
    return MappingRegistry;
})();
module.exports = MappingRegistry;
