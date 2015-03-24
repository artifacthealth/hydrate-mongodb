var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var ObjectIdGenerator = (function () {
    function ObjectIdGenerator() {
        // Turn on caching of the hex string representation of the ObjectID
        mongodb.ObjectID.cacheHexString = true;
    }
    ObjectIdGenerator.prototype.generate = function () {
        return new ObjectID();
    };
    ObjectIdGenerator.prototype.validate = function (value) {
        return value instanceof ObjectID;
    };
    ObjectIdGenerator.prototype.fromString = function (text) {
        return ObjectID.createFromHexString(text);
    };
    ObjectIdGenerator.prototype.areEqual = function (first, second) {
        return first.equals(second);
    };
    return ObjectIdGenerator;
})();
module.exports = ObjectIdGenerator;
