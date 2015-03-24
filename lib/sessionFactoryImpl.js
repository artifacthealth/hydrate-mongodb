var SessionImpl = require("./sessionImpl");
var PersisterImpl = require("./persisterImpl");
var SessionFactoryImpl = (function () {
    function SessionFactoryImpl(collections, mappingRegistry) {
        this._collections = collections;
        // TODO: get rid of mapping registry and handle directly in session factory
        this._mappingRegistry = mappingRegistry;
    }
    SessionFactoryImpl.prototype.createSession = function () {
        return new SessionImpl(this);
    };
    SessionFactoryImpl.prototype.getMappingForObject = function (obj) {
        var mapping = this._mappingRegistry.getMappingForObject(obj);
        if (mapping && (mapping.flags & 1024 /* Entity */)) {
            return mapping;
        }
    };
    SessionFactoryImpl.prototype.getMappingForConstructor = function (ctr) {
        var mapping = this._mappingRegistry.getMappingForConstructor(ctr);
        if (mapping && (mapping.flags & 1024 /* Entity */)) {
            return mapping;
        }
    };
    SessionFactoryImpl.prototype.createPersister = function (session, mapping) {
        return new PersisterImpl(session, mapping, this._collections[mapping.inheritanceRoot.id]);
    };
    return SessionFactoryImpl;
})();
module.exports = SessionFactoryImpl;
