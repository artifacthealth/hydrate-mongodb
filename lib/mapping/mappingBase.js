var ResolveContext = require("./resolveContext");
var nextMappingId = 1;
var MappingBase = (function () {
    function MappingBase(flags) {
        this.flags = flags;
        this.id = nextMappingId++;
    }
    MappingBase.prototype.read = function (context, value) {
        throw new Error("Not implemented");
    };
    MappingBase.prototype.write = function (value, path, errors, visited) {
        throw new Error("Not implemented");
    };
    MappingBase.prototype.watch = function (value, observer, visited) {
    };
    MappingBase.prototype.walk = function (session, value, flags, entities, embedded, references) {
    };
    MappingBase.prototype.areEqual = function (documentValue1, documentValue2) {
        if (documentValue1 === documentValue2)
            return true;
        if (documentValue1 === null || documentValue2 === null)
            return false;
        if (documentValue1 !== documentValue1 && documentValue2 !== documentValue2)
            return true; // NaN === NaN
        return false;
    };
    MappingBase.prototype.fetch = function (session, parentEntity, value, path, depth, callback) {
        if (depth == path.length) {
            callback(null, value);
        }
        else {
            callback(new Error("Undefined property '" + path[depth] + "' in path '" + path.join(".") + "'."));
        }
    };
    MappingBase.prototype.fetchInverse = function (session, parentEntity, propertyName, path, depth, callback) {
        callback(new Error("Mapping does not support inverse relationships."));
    };
    MappingBase.prototype.resolve = function (pathOrContext) {
        var context, cache = this._resolveCache;
        if (typeof pathOrContext === "string") {
            if (!cache) {
                cache = this._resolveCache = {};
            }
            else {
                var context = cache[pathOrContext];
                if (context) {
                    return context;
                }
            }
            context = new ResolveContext(pathOrContext);
        }
        else {
            context = pathOrContext;
        }
        this._resolveCore(context);
        if (cache) {
            return cache[pathOrContext] = context;
        }
    };
    MappingBase.prototype._resolveCore = function (context) {
        if (!context.isEop) {
            context.setError("Undefined property.");
        }
    };
    return MappingBase;
})();
module.exports = MappingBase;
