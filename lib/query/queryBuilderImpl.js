var QueryBuilderImpl = (function () {
    function QueryBuilderImpl(session, persister) {
        this._session = session;
        this._persister = persister;
    }
    QueryBuilderImpl.prototype.findAll = function (criteriaOrCallback, callback) {
        var query = this._createQuery(1 /* FindAll */);
        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        return query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.findOne = function (criteriaOrCallback, callback) {
        var query = this._createQuery(8 /* FindOne */);
        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        return query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.findOneById = function (id, callback) {
        if (typeof id === "string") {
            id = this._persister.identity.fromString(id);
        }
        var query = this._createQuery(16 /* FindOneById */);
        query.id = id;
        return query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.findOneAndRemove = function (criteriaOrCallback, callback) {
        var query = this._createQuery(32 /* FindOneAndRemove */);
        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        return query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.findOneAndUpdate = function (criteriaOrUpdateDocument, updateDocumentOrCallback, callback) {
        var query = this._createQuery(64 /* FindOneAndUpdate */);
        if (typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
            callback = updateDocumentOrCallback;
            query.updateDocument = criteriaOrUpdateDocument;
            query.criteria = {};
        }
        else {
            query.updateDocument = updateDocumentOrCallback;
            query.criteria = criteriaOrUpdateDocument;
        }
        return query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.removeAll = function (criteriaOrCallback, callback) {
        var query = this._createQuery(128 /* RemoveAll */);
        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.removeOne = function (criteriaOrCallback, callback) {
        var query = this._createQuery(256 /* RemoveOne */);
        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.updateAll = function (criteriaOrUpdateDocument, updateDocumentOrCallback, callback) {
        var query = this._createQuery(512 /* UpdateAll */);
        if (typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
            callback = updateDocumentOrCallback;
            query.updateDocument = criteriaOrUpdateDocument;
            query.criteria = {};
        }
        else {
            query.updateDocument = updateDocumentOrCallback;
            query.criteria = criteriaOrUpdateDocument;
        }
        query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.updateOne = function (criteriaOrUpdateDocument, updateDocumentOrCallback, callback) {
        var query = this._createQuery(1024 /* UpdateOne */);
        if (typeof updateDocumentOrCallback == "function" || updateDocumentOrCallback === undefined) {
            callback = updateDocumentOrCallback;
            query.updateDocument = criteriaOrUpdateDocument;
            query.criteria = {};
        }
        else {
            query.updateDocument = updateDocumentOrCallback;
            query.criteria = criteriaOrUpdateDocument;
        }
        query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.distinct = function (key, criteriaOrCallback, callback) {
        var query = this._createQuery(2048 /* Distinct */);
        query.key = key;
        if (typeof criteriaOrCallback === "function") {
            query.criteria = {};
            callback = criteriaOrCallback;
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype.count = function (criteriaOrCallback, callback) {
        var query = this._createQuery(4096 /* Count */);
        if (typeof criteriaOrCallback == "function") {
            callback = criteriaOrCallback;
            query.criteria = {};
        }
        else {
            query.criteria = criteriaOrCallback || {};
        }
        return query.handleCallback(callback);
    };
    QueryBuilderImpl.prototype._createQuery = function (kind) {
        return new QueryObject(this._session, this._persister, kind);
    };
    return QueryBuilderImpl;
})();
var QueryObject = (function () {
    function QueryObject(session, persister, kind) {
        this.kind = kind;
        this._session = session;
        this._persister = persister;
    }
    Object.defineProperty(QueryObject.prototype, "readOnly", {
        get: function () {
            return (this.kind & 6171 /* ReadOnly */) !== 0;
        },
        enumerable: true,
        configurable: true
    });
    QueryObject.prototype.fetch = function (path, callback) {
        if (!this.fetchPaths) {
            this.fetchPaths = [];
        }
        if (typeof path === "string") {
            this.fetchPaths.push(path);
        }
        else {
            this.fetchPaths = this.fetchPaths.concat(path);
        }
        return this.handleCallback(callback);
    };
    QueryObject.prototype.sort = function (field, directionOrCallback, callback) {
        if (!this.sortValue) {
            this.sortValue = [];
        }
        if (typeof field === "string") {
            if (typeof directionOrCallback === "number") {
                this.sortValue.push([field, directionOrCallback]);
            }
            else {
                throw new Error("Expected second parameter to be the sort direction when first parameter is a string.");
            }
        }
        else {
            if (!Array.isArray(field)) {
                throw new Error("Expected first parameter to be a string or array");
            }
            this.sortValue = this.sortValue.concat(field);
        }
        if (typeof directionOrCallback === "number") {
            return this.handleCallback(callback);
        }
        else {
            return this.handleCallback(directionOrCallback);
        }
    };
    QueryObject.prototype.returnUpdated = function (callback) {
        this.wantsUpdated = true;
        return this.handleCallback(callback);
    };
    QueryObject.prototype.limit = function (value, callback) {
        this.limitCount = value;
        return this.handleCallback(callback);
    };
    QueryObject.prototype.skip = function (value, callback) {
        this.skipCount = value;
        return this.handleCallback(callback);
    };
    QueryObject.prototype.batchSize = function (value, callback) {
        this.batchSizeValue = value;
        return this.handleCallback(callback);
    };
    QueryObject.prototype.each = function (iterator, callback) {
        if (!iterator) {
            throw new Error("Missing required argument 'iterator'.");
        }
        if (!callback) {
            throw new Error("Missing required argument 'callback'.");
        }
        this.kind = 2 /* FindEach */;
        this.iterator = iterator;
        this.handleCallback(callback);
    };
    QueryObject.prototype.eachSeries = function (iterator, callback) {
        if (!iterator) {
            throw new Error("Missing required argument 'iterator'.");
        }
        if (!callback) {
            throw new Error("Missing required argument 'callback'.");
        }
        this.kind = 4 /* FindEachSeries */;
        this.iterator = iterator;
        this.handleCallback(callback);
    };
    QueryObject.prototype.handleCallback = function (callback) {
        if (callback) {
            if (this._executed) {
                callback(new Error("Query already executed. A callback can only be passed to one function in the chain."));
            }
            else {
                this._session.executeQuery(this, callback);
                this._executed = true;
            }
        }
        return this;
    };
    QueryObject.prototype.execute = function (callback) {
        this._persister.executeQuery(this, callback);
    };
    return QueryObject;
})();
module.exports = QueryBuilderImpl;
