var ResolveContext = (function () {
    function ResolveContext(path) {
        this.path = path;
        if (typeof path !== "string") {
            throw new Error("Expected argument 'path' to be a string.");
        }
        this._path = path.split(".");
        this._resolvePath = new Array(this._path.length);
        this._depth = 0;
    }
    Object.defineProperty(ResolveContext.prototype, "currentProperty", {
        get: function () {
            return this._path[this._depth];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ResolveContext.prototype, "isEop", {
        get: function () {
            return this.path === undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ResolveContext.prototype, "isFirst", {
        get: function () {
            return this._depth === 0;
        },
        enumerable: true,
        configurable: true
    });
    ResolveContext.prototype.setError = function (message) {
        if (this._path.length == 1) {
            this.error = new Error("Invalid path '" + this.path + "': " + message);
        }
        else {
            this.error = new Error("Invalid path '" + this.path + "' at property '" + this.currentProperty + "': " + message);
        }
        this._finished();
    };
    ResolveContext.prototype.resolveProperty = function (mapping, resolvedProperty) {
        this._resolvePath[this._depth] = resolvedProperty;
        this._depth++;
        if (this._depth === this._path.length) {
            this.resolvedMapping = mapping;
            this.resolvedPath = this._resolvePath.join(".");
            this._finished();
            return true;
        }
        return false;
    };
    ResolveContext.prototype._finished = function () {
        // clear out some variables we are no longer using since we will be caching this class
        this._depth = undefined;
        this._path = undefined;
        this._resolvePath = undefined;
    };
    return ResolveContext;
})();
module.exports = ResolveContext;
